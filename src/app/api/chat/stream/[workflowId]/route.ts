import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { apiLogger } from '@/lib/logger';
import { getTemporalClient } from '@/lib/temporal';
import { subscribeToWorkflow } from '@/lib/redis';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { workflowId } = await params;

    // Verify ownership
    const execution = await prisma.workflowExecution.findUnique({
      where: { workflowId },
      include: { companion: true }
    });

    if (!execution || execution.companion.userId !== user.id) {
      return new Response('Unauthorized', { status: 403 });
    }

    // `from` lets reconnecting clients resume without duplicating already-seen tokens
    const url = new URL(request.url);
    const fromParam = parseInt(url.searchParams.get('from') || '0', 10);
    const resumeFrom = isNaN(fromParam) || fromParam < 0 ? 0 : fromParam;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const client = await getTemporalClient();
          const handle = client.workflow.getHandle(workflowId);

          // ── Send any text already streamed before this SSE connection opened ──
          // Uses the `from` cursor so reconnects only get unseen characters.
          let lastTextLength = 0;
          const initialExecution = await prisma.workflowExecution.findUnique({
            where: { workflowId },
            select: { streamedText: true }
          });
          const existingText = initialExecution?.streamedText || '';
          lastTextLength = existingText.length;
          const catchUpText = existingText.slice(resumeFrom);
          if (catchUpText) {
            const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: catchUpText })}\n\n`;
            controller.enqueue(encoder.encode(tokenEvent));
          }

          // ── Subscribe to Redis for real-time token delivery ───────────────────
          let unsubscribeRedis: (() => void) | null = null;
          const useRedis = !!env.REDIS_URL;

          if (useRedis) {
            try {
              unsubscribeRedis = await subscribeToWorkflow(workflowId, (delta) => {
                try {
                  const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`;
                  controller.enqueue(encoder.encode(tokenEvent));
                } catch {
                  // Stream already closed — ignore
                }
              });
            } catch (redisErr) {
              apiLogger.warn({ workflowId, error: redisErr }, 'Redis unavailable, falling back to DB polling for tokens');
            }
          }

          // ── Poll for progress/completion (and token fallback without Redis) ───
          // With Redis: 500 ms is plenty for progress updates.
          // Without Redis: 200 ms keeps token latency acceptable.
          const pollMs = unsubscribeRedis ? 500 : 200;

          let pollInterval: ReturnType<typeof setInterval>;

          function cleanup() {
            clearInterval(pollInterval);
            unsubscribeRedis?.();
            try { controller.close(); } catch { /* already closed */ }
          }

          pollInterval = setInterval(async () => {
            try {
              const dbExecution = await prisma.workflowExecution.findUnique({
                where: { workflowId },
                select: {
                  streamedText: true,
                  status: true,
                  progress: true,
                  currentStep: true,
                  imageUrl: true,
                  audioUrl: true,
                  error: true
                }
              });

              if (!dbExecution) {
                apiLogger.error({ workflowId }, 'WorkflowExecution not found during poll');
                return;
              }

              // DB token fallback — only used when Redis is unavailable
              if (!unsubscribeRedis) {
                const currentText = dbExecution.streamedText || '';
                const newText = currentText.slice(lastTextLength);
                if (newText) {
                  lastTextLength = currentText.length;
                  const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: newText })}\n\n`;
                  controller.enqueue(encoder.encode(tokenEvent));
                }
              }

              // Query Temporal for progress, fall back to DB values
              let workflowProgress: {
                status: string;
                progress: number;
                currentStep: string;
              };
              try {
                workflowProgress = await handle.query('progress') as {
                  status: string;
                  progress: number;
                  currentStep: string;
                };
              } catch {
                workflowProgress = {
                  status: dbExecution.status,
                  progress: dbExecution.progress,
                  currentStep: dbExecution.currentStep || ''
                };
              }

              // Send progress event
              const progressEvent = `event: progress\ndata: ${JSON.stringify({
                status: workflowProgress.status,
                progress: workflowProgress.progress,
                currentStep: workflowProgress.currentStep
              })}\n\n`;
              controller.enqueue(encoder.encode(progressEvent));

              // Check for completion
              if (workflowProgress.status === 'completed' || workflowProgress.status === 'failed') {
                clearInterval(pollInterval);
                unsubscribeRedis?.();

                try {
                  const result = await handle.result();
                  const completeEvent = `event: complete\ndata: ${JSON.stringify({
                    text: result.text,
                    imageUrl: result.imageUrl,
                    audioUrl: result.audioUrl,
                    updatedState: result.updatedState
                  })}\n\n`;
                  controller.enqueue(encoder.encode(completeEvent));
                } catch (resultError) {
                  apiLogger.error({ error: resultError, workflowId }, 'Error getting workflow result');
                  const errorEvent = `event: error\ndata: ${JSON.stringify({ error: String(resultError) })}\n\n`;
                  controller.enqueue(encoder.encode(errorEvent));
                }
                controller.close();
              }
            } catch (error) {
              apiLogger.error({ error, workflowId }, 'SSE poll error');
              // Continue polling even on transient errors
            }
          }, pollMs);

          // Clean up on client disconnect
          request.signal.addEventListener('abort', cleanup);

        } catch (error) {
          apiLogger.error({ error, workflowId }, 'SSE setup error');
          const errorEvent = `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    apiLogger.error({ error }, 'SSE endpoint error');
    return new Response('Internal Server Error', { status: 500 });
  }
}
