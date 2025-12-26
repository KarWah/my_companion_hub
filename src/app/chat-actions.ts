"use server";

import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, verifyCompanionOwnership } from '@/lib/auth-helpers';
import { checkChatRateLimit } from '@/lib/rate-limit-db';
import { getTemporalClient } from '@/lib/temporal';
import { apiLogger, createRequestLogger, startTimer } from '@/lib/logger';

export async function sendMessage(formData: FormData) {
  const requestId = nanoid();
  const timer = startTimer();
  const log = createRequestLogger('api', { requestId, action: 'send_message' });

  const message = formData.get("message") as string;
  const companionId = formData.get("companionId") as string;
  const shouldGenImage = formData.get("generateImage") === "on";

  log.info({
    companionId,
    messageLength: message?.length || 0,
    shouldGenImage,
  }, 'Received chat message');

  if (!message || !companionId) {
    log.warn('Missing required fields');
    return { error: "Missing fields" };
  }

  try {
    // Auth check
    const user = await getAuthenticatedUser();
    log.child({ userId: user.id });

    await verifyCompanionOwnership(companionId, user.id);

    // Rate limiting check
    const rateLimit = await checkChatRateLimit(user.id);
    if (!rateLimit.success) {
      log.warn({ resetTime: rateLimit.resetTime }, 'Rate limit exceeded');
      return { error: rateLimit.error || "Too many messages" };
    }

  // 1. Save user message
  const userMessage = await prisma.message.create({
    data: {
      role: "user",
      content: message,
      companionId,
    },
  });

  // 2. Fetch history
  const history = await prisma.message.findMany({
    where: { companionId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const formattedHistory = history.reverse().map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content
  }));

  const companion = await prisma.companion.findUnique({ where: { id: companionId } });

    // 3. Start workflow (non-blocking)
    const client = await getTemporalClient();

    const workflowId = `chat-${companionId}-${nanoid()}`;

    log.info({ workflowId }, 'Creating workflow execution record');

    // Create execution record
    await prisma.workflowExecution.create({
      data: {
        workflowId,
        companionId,
        status: 'started',
        progress: 0,
        currentStep: 'Starting...',
        userMessageId: userMessage.id,
        streamedText: ''
      }
    });

    // Start workflow without awaiting
    await client.workflow.start('ChatWorkflow', {
      taskQueue: 'companion-chat-queue',
      workflowId,
      args: [{
        companionId,
        companionName: companion?.name || 'Companion',
        userMessage: message,
        userName: user.name,
        currentOutfit: companion?.currentOutfit || "casual clothes",
        currentLocation: companion?.currentLocation || "gaming setup, bedroom",
        currentAction: companion?.currentAction || "looking at viewer",
        msgHistory: formattedHistory,
        shouldGenerateImage: shouldGenImage
      }],
    });

    log.info({
      workflowId,
      duration: timer(),
    }, 'Workflow started successfully');

    // Return immediately
    return {
      success: true,
      workflowId,
      userMessageId: userMessage.id,
      requestId,
    };

  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: timer(),
    }, 'Failed to send message');

    return {
      error: error instanceof Error ? error.message : 'Failed to send message',
      requestId,
    };
  }
}

// Finalize message when workflow completes
export async function finalizeMessage(workflowId: string) {
  const timer = startTimer();
  const log = createRequestLogger('api', {
    workflowId,
    action: 'finalize_message',
  });

  log.info('Finalizing workflow message');

  try {
    const user = await getAuthenticatedUser();

    const execution = await prisma.workflowExecution.findUnique({
      where: { workflowId },
      include: { companion: true }
    });

    if (!execution || execution.companion.userId !== user.id) {
      log.warn({ userId: user.id }, 'Unauthorized finalize attempt');
      throw new Error("Unauthorized");
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);

    const result = await handle.result();

    log.info({
      textLength: result.text?.length || 0,
      hasImage: !!result.imageUrl,
    }, 'Workflow result received');

    // Save assistant message
    await prisma.message.create({
      data: {
        role: "assistant",
        content: result.text,
        imageUrl: result.imageUrl,
        companionId: execution.companionId,
      },
    });

    // Update execution
    await prisma.workflowExecution.update({
      where: { workflowId },
      data: {
        status: 'completed',
        progress: 100,
        streamedText: result.text,
        imageUrl: result.imageUrl
      }
    });

    revalidatePath("/");

    log.info({ duration: timer() }, 'Message finalized successfully');
    return { success: true };

  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: timer(),
    }, 'Failed to finalize message');

    await prisma.workflowExecution.update({
      where: { workflowId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }).catch(() => {
      // Ignore update errors if workflow execution doesn't exist
    });

    throw error;
  }
}