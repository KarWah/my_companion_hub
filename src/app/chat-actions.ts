"use server";

import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, verifyCompanionOwnership } from '@/lib/auth-helpers';
import { checkChatRateLimit } from '@/lib/rate-limit-db';

export async function sendMessage(formData: FormData) {
  const message = formData.get("message") as string;
  const companionId = formData.get("companionId") as string;
  const shouldGenImage = formData.get("generateImage") === "on";

  if (!message || !companionId) return;

  // Auth check
  const user = await getAuthenticatedUser();
  await verifyCompanionOwnership(companionId, user.id);

  // Rate limiting check
  const rateLimit = await checkChatRateLimit(user.id);
  if (!rateLimit.success) {
    throw new Error(rateLimit.error || "Too many messages. Please slow down.");
  }

  // 1. Save User Message to DB
  await prisma.message.create({
    data: {
      role: "user",
      content: message,
      companionId,
    },
  });

  // 2. Fetch History
  const history = await prisma.message.findMany({
    where: { companionId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  
  // 3. Format for LLM
  const formattedHistory = history.reverse().map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content
  }));

  const companion = await prisma.companion.findUnique({ where: { id: companionId } });

  // 4. Start Temporal Workflow
  const connection = await Connection.connect({ address: 'localhost:7233' });
  
  const client = new Client({
    connection,
  });

  const handle = await client.workflow.start('ChatWorkflow', {
    taskQueue: 'companion-chat-queue',
    workflowId: `chat-${companionId}-${nanoid()}`,
    args: [{
      companionId,
      userMessage: message,
      userName: user.name,
      currentOutfit: companion?.currentOutfit || "casual clothes",
      currentLocation: companion?.currentLocation || "gaming setup, bedroom",
      currentAction: companion?.currentAction || "looking at viewer",
      msgHistory: formattedHistory,
      shouldGenerateImage: shouldGenImage
    }],
  });

  const result = await handle.result();

  await prisma.message.create({
    data: {
      role: "assistant",
      content: result.text,
      imageUrl: result.imageUrl,
      companionId,
    },
  });

  revalidatePath("/");
}