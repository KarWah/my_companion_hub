/**
 * Memory Extraction Activity
 *
 * Analyzes conversations to extract important, memorable information and stores it
 * in the database with semantic embeddings for future retrieval.
 */

import type { MessageHistory, MemoryExtractionResult } from '@/types';
import { workflowLogger, startTimer, logError } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import { generateEmbedding } from '@/lib/embeddings';
import { buildMemoryExtractionPrompt } from '@/config/prompts/memory-extraction';
import { extractJSON } from './helpers/json-parser';

/**
 * Extract and store memories from a conversation
 *
 * This function:
 * 1. Analyzes the conversation using an LLM to identify memorable information
 * 2. Generates embeddings for each extracted memory
 * 3. Stores memories in the database for future retrieval
 *
 * @param companionId - ID of the companion
 * @param companionName - Name of the companion
 * @param userName - Name of the user
 * @param userMessage - User's message in the conversation
 * @param llmResponse - Companion's response
 * @param recentHistory - Last 3-4 messages for context
 * @param messageId - ID of the message being processed
 * @returns Extraction result with list of extracted memories
 */
export async function extractAndStoreMemories(
  companionId: string,
  companionName: string,
  userName: string,
  userMessage: string,
  llmResponse: string,
  recentHistory: MessageHistory[], // Last 3-4 messages for context
  messageId: string
): Promise<MemoryExtractionResult> {
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'extractAndStoreMemories',
    companionId,
  });

  log.debug('Starting memory extraction');

  // Build conversation context with role labels
  const historyText = recentHistory
    .map(m => `${m.role === 'user' ? userName : companionName}: ${m.content}`)
    .join('\n');

  const conversationContext = `${historyText}\n${userName}: ${userMessage}\n${companionName}: ${llmResponse}`;

  // Call LLM to extract memories
  const systemPrompt = buildMemoryExtractionPrompt(companionName, userName, conversationContext);

  try {
    const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.NOVITA_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sao10k/l31-70b-euryale-v2.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Extract memories from the conversation above." }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent extraction
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'Memory extraction API error');
      throw new Error(`Memory extraction API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = extractJSON(data.choices[0].message.content) as any;

    // If no memories extracted or parsing failed, return early
    if (!parsed.memories || parsed.memories.length === 0) {
      log.info({
        duration: timer(),
        reasoning: parsed.reasoning || 'No reasoning provided'
      }, 'No memories extracted from conversation');
      return { memories: [] };
    }

    log.debug({
      memoriesFound: parsed.memories.length,
      reasoning: parsed.reasoning
    }, 'Memories identified');

    // Generate embeddings and store memories in parallel
    const memoryPromises = parsed.memories.map(async (mem: any) => {
      try {
        // Validate memory content
        if (!mem.content || mem.content.trim().length === 0) {
          log.warn({ memory: mem }, 'Skipping memory with empty content');
          return null;
        }

        // Generate embedding for semantic search
        const embedding = await generateEmbedding(mem.content);

        // Validate and normalize category
        const validCategories = ['personal_fact', 'preference', 'event', 'relationship', 'emotional_moment'];
        const category = validCategories.includes(mem.category) ? mem.category : 'personal_fact';

        // Clamp importance to 1-10 range
        const importance = Math.min(Math.max(mem.importance ?? 5, 1), 10);

        // Store in database with embedding
        // Note: We use type assertion here because Prisma's Unsupported type doesn't generate proper types
        const memoryData: any = {
          companionId,
          content: mem.content.trim(),
          category,
          importance,
          embedding: embedding, // pgvector vector(1536) type
          sourceMessageIds: [messageId],
          context: mem.context || null,
          isActive: true,
          accessCount: 0,
          lastAccessedAt: new Date(),
        };

        const stored = await prisma.memory.create({
          data: memoryData
        });

        log.debug({
          memoryId: stored.id,
          content: stored.content,
          category: stored.category,
          importance: stored.importance
        }, 'Memory stored successfully');

        return stored;
      } catch (error) {
        logError(log, error, { memory: mem }, 'Failed to store individual memory');
        return null;
      }
    });

    const storedMemories = (await Promise.all(memoryPromises)).filter(Boolean);

    log.info({
      duration: timer(),
      memoriesExtracted: parsed.memories.length,
      memoriesStored: storedMemories.length,
      categories: storedMemories.map((m: any) => m.category),
    }, 'Memory extraction completed');

    // Apply relationship deltas if present and non-zero
    const rel = parsed.relationshipUpdate;
    if (rel && (rel.affectionDelta !== 0 || rel.trustDelta !== 0)) {
      const affectionDelta = Math.round(Math.min(3, Math.max(-3, rel.affectionDelta || 0)));
      const trustDelta = Math.round(Math.min(3, Math.max(-3, rel.trustDelta || 0)));

      if (affectionDelta !== 0 || trustDelta !== 0) {
        try {
          // Use raw SQL with GREATEST/LEAST to clamp within 0-100
          await prisma.$executeRaw`
            UPDATE "Companion"
            SET
              "affectionLevel" = GREATEST(0, LEAST(100, "affectionLevel" + ${affectionDelta})),
              "trustLevel"     = GREATEST(0, LEAST(100, "trustLevel"     + ${trustDelta}))
            WHERE id = ${companionId}
          `;
          log.info({ affectionDelta, trustDelta, status: rel.status }, 'Relationship levels updated');
        } catch (relError) {
          log.error({ error: relError }, 'Failed to update relationship levels');
          // Non-critical — don't throw
        }
      }
    }

    return {
      memories: parsed.memories,
      relationshipUpdate: rel,
    };

  } catch (error) {
    logError(log, error, { duration: timer() }, 'Memory extraction failed');

    // Don't throw - memory extraction failure shouldn't break the conversation
    // Return empty result and log the error for monitoring
    return { memories: [] };
  }
}
