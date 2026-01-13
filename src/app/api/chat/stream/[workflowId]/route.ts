import { Client, Connection } from '@temporalio/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { apiLogger } from '@/lib/logger';
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
        const client = new Client({ connection });

        try {
          const handle = client.workflow.getHandle(workflowId);
          let lastTextLength = 0;

          // Poll every 100ms for smooth streaming (faster for token-by-token feel)
          const pollInterval = setInterval(async () => {
            try {
              // Poll database for streaming text (updated by activity in real-time)
              const dbExecution = await prisma.workflowExecution.findUnique({
                where: { workflowId },
                select: {
                  streamedText: true,
                  status: true,
                  progress: true,
                  currentStep: true,
                  imageUrl: true,
                  error: true
                }
              });

              if (!dbExecution) {
                apiLogger.error({ workflowId }, 'WorkflowExecution not found');
                return;
              }

              // Check for new tokens from database
              const currentText = dbExecution.streamedText || '';
              const newText = currentText.slice(lastTextLength);
              if (newText) {
                lastTextLength = currentText.length;

                // Send token event
                const tokenEvent = `event: token\ndata: ${JSON.stringify({ token: newText })}\n\n`;
                controller.enqueue(encoder.encode(tokenEvent));
              }

              // Also query workflow for progress updates
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
              } catch (queryError) {
                // Workflow might not be ready yet, use DB status
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

              // Check if complete
              if (workflowProgress.status === 'completed' || workflowProgress.status === 'failed') {
                clearInterval(pollInterval);

                try {
                  const result = await handle.result();

                  const completeEvent = `event: complete\ndata: ${JSON.stringify({
                    text: result.text,
                    imageUrl: result.imageUrl,
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
              // Continue polling even if query fails temporarily
            }
          }, 100);

          // Clean up on disconnect
          request.signal.addEventListener('abort', () => {
            clearInterval(pollInterval);
            controller.close();
          });

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
