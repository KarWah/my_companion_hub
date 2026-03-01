import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { getTemporalClient } from "@/lib/temporal";
import { getNextRunTime } from "@/lib/cron-scheduler";
import { cleanupOldAudioFiles } from "@/lib/storage";
import { apiLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint to execute scheduled messages.
 * Should be called every minute by an external cron service (e.g., Vercel Cron, Railway, etc.)
 *
 * Verifies CRON_SECRET header to prevent unauthorized calls.
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = env.CRON_SECRET;

  if (!expectedSecret) {
    apiLogger.warn("CRON_SECRET not configured, skipping scheduled messages");
    return NextResponse.json({ message: "Cron not configured" }, { status: 200 });
  }

  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  const provided = Buffer.from(authHeader || '');
  const isValid = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!isValid) {
    apiLogger.warn("Invalid cron secret attempted");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clean up old completed/failed WorkflowExecution rows (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count: cleanedUp } = await prisma.workflowExecution.deleteMany({
      where: {
        status: { in: ['completed', 'failed'] },
        createdAt: { lt: thirtyDaysAgo },
      },
    });
    if (cleanedUp > 0) {
      apiLogger.info({ count: cleanedUp }, 'Cleaned up old WorkflowExecution rows');
    }

    // Clean up old ScheduleLog rows (older than 30 days)
    const { count: logsCleanedUp } = await prisma.scheduleLog.deleteMany({
      where: { executedAt: { lt: thirtyDaysAgo } },
    });
    if (logsCleanedUp > 0) {
      apiLogger.info({ count: logsCleanedUp }, 'Cleaned up old ScheduleLog rows');
    }

    // Clean up audio files older than 7 days
    const audioFilesDeleted = await cleanupOldAudioFiles(7);

    // Find all scheduled messages that should run now
    const now = new Date();
    const dueMessages = await prisma.scheduledMessage.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now
        }
      },
      include: {
        companion: {
          include: {
            user: true
          }
        }
      }
    });

    apiLogger.info({ count: dueMessages.length }, "Found due scheduled messages");

    const results: Array<{ id: string; status: string; workflowId?: string; error?: string }> = [];

    for (const scheduledMessage of dueMessages) {
      const { companion } = scheduledMessage;

      try {
        // Get recent message history for context
        const history = await prisma.message.findMany({
          where: { companionId: companion.id },
          orderBy: { createdAt: "desc" },
          take: 5
        });

        const formattedHistory = history.reverse().map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: m.content
        }));

        // Create a unique workflow ID
        const workflowId = `scheduled-${companion.id}-${nanoid()}`;

        // Save user message (as system-initiated)
        const userMessage = await prisma.message.create({
          data: {
            role: "user",
            content: `[Scheduled] ${scheduledMessage.messageTemplate}`,
            companionId: companion.id
          }
        });

        // Create workflow execution record
        await prisma.workflowExecution.create({
          data: {
            workflowId,
            companionId: companion.id,
            status: "started",
            progress: 0,
            currentStep: "Starting scheduled message...",
            userMessageId: userMessage.id,
            streamedText: ""
          }
        });

        // Start the workflow
        const client = await getTemporalClient();
        await client.workflow.start("ChatWorkflow", {
          taskQueue: "companion-chat-queue",
          workflowId,
          args: [
            {
              companionId: companion.id,
              companionName: companion.name,
              userMessage: scheduledMessage.messageTemplate,
              userName: companion.user.name,
              currentOutfit: companion.currentOutfit,
              currentLocation: companion.currentLocation,
              currentAction: companion.currentAction,
              msgHistory: formattedHistory,
              shouldGenerateImage: false,
              voiceEnabled: companion.voiceEnabled && !!companion.voiceId,
              voiceId: companion.voiceId || undefined
            }
          ]
        });

        // Wait for workflow to complete (with timeout)
        const handle = client.workflow.getHandle(workflowId);
        const result = await Promise.race([
          handle.result(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Workflow timeout")), 60000)
          )
        ]);

        if (result) {
          // Save assistant response
          await prisma.message.create({
            data: {
              role: "assistant",
              content: result.text,
              imageUrl: result.imageUrl,
              audioUrl: result.audioUrl,
              companionId: companion.id
            }
          });

          // Update workflow execution
          await prisma.workflowExecution.update({
            where: { workflowId },
            data: {
              status: "completed",
              progress: 100,
              streamedText: result.text,
              imageUrl: result.imageUrl,
              audioUrl: result.audioUrl
            }
          });
        }

        // Log success
        await prisma.scheduleLog.create({
          data: {
            scheduledMessageId: scheduledMessage.id,
            status: "success",
            workflowId
          }
        });

        // Update scheduled message with next run time
        const nextRunAt = getNextRunTime(scheduledMessage.cronExpression, scheduledMessage.timezone);
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessage.id },
          data: {
            lastRunAt: now,
            nextRunAt,
            runCount: { increment: 1 }
          }
        });

        results.push({ id: scheduledMessage.id, status: "success", workflowId });
        apiLogger.info({ scheduledMessageId: scheduledMessage.id, workflowId }, "Scheduled message executed");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Log failure
        await prisma.scheduleLog.create({
          data: {
            scheduledMessageId: scheduledMessage.id,
            status: "failed",
            error: errorMessage
          }
        });

        // Still update next run time to prevent retry loops
        const nextRunAt = getNextRunTime(scheduledMessage.cronExpression, scheduledMessage.timezone);
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessage.id },
          data: {
            lastRunAt: now,
            nextRunAt
          }
        });

        results.push({ id: scheduledMessage.id, status: "failed", error: errorMessage });
        apiLogger.error({ error, scheduledMessageId: scheduledMessage.id }, "Scheduled message failed");
      }
    }

    const duration = Date.now() - startTime;
    apiLogger.info({ duration, results }, "Cron job completed");

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      duration
    });
  } catch (error) {
    apiLogger.error({ error }, "Cron endpoint error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
