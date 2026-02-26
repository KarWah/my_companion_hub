/**
 * Memory Retrieval Activity
 *
 * Retrieves relevant memories from the database using hybrid ranking
 * (semantic similarity + recency + importance).
 */

import type { MemoryRecord, MemoryRetrievalResult } from '@/types';
import { workflowLogger, startTimer, logError } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';

// Configuration constants
const TOP_K = 10; // Retrieve top 10 memories
const RECENCY_WEIGHT = 0.3;
const IMPORTANCE_WEIGHT = 0.1;
const SIMILARITY_WEIGHT = 0.6;

// Validate weights sum to 1.0
const TOTAL_WEIGHT = RECENCY_WEIGHT + IMPORTANCE_WEIGHT + SIMILARITY_WEIGHT;
if (Math.abs(TOTAL_WEIGHT - 1.0) > 0.001) {
  throw new Error(`Memory retrieval weights must sum to 1.0, got ${TOTAL_WEIGHT}`);
}

/**
 * Retrieve relevant memories for a given user message
 *
 * Uses hybrid ranking combining:
 * - Semantic similarity (60%): How related is the memory to the current message
 * - Recency (30%): Newer memories are weighted higher
 * - Importance (10%): High-importance memories boosted
 *
 * @param companionId - ID of the companion
 * @param userMessage - User's current message to find relevant memories for
 * @returns Top K most relevant memories with relevance scores
 */
export async function retrieveRelevantMemories(
  companionId: string,
  userMessage: string
): Promise<MemoryRetrievalResult> {
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'retrieveRelevantMemories',
    companionId,
  });

  try {
    // Try to generate embedding for semantic similarity ranking.
    // Falls back to importance+recency ranking if embeddings are unavailable.
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await generateEmbedding(userMessage);
      log.debug({ messageLength: userMessage.length }, 'Embedding generated for memory query');
    } catch {
      log.debug('Embeddings unavailable — falling back to importance+recency ranking');
    }

    // Fetch all active memories for this companion
    // NOTE: In production with 1000+ memories, use pgvector's native similarity search:
    // SELECT * FROM "Memory"
    // WHERE companionId = '...' AND isActive = true
    // ORDER BY embedding <=> '[...]'::vector
    // LIMIT 100;
    const memories = await prisma.memory.findMany({
      where: {
        companionId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100, // Limit to recent 100 for performance (adjust based on needs)
    });

    if (memories.length === 0) {
      log.info({ duration: timer() }, 'No memories found for companion');
      return { memories: [], totalRelevant: 0 };
    }

    log.debug({ totalMemories: memories.length }, 'Calculating relevance scores');

    // Calculate hybrid relevance scores
    const now = Date.now();
    const scoredMemories = memories.map((memory: any) => {
      // Explicitly handle the embedding field (pgvector stored as array in JSON)
      // Prisma returns it as unknown, so we need to validate and cast
      const embeddingArray = memory.embedding as unknown as number[] | null;

      // 1. Semantic similarity (60%) — only if both query and memory embeddings are available
      const similarity = queryEmbedding && embeddingArray && Array.isArray(embeddingArray)
        ? cosineSimilarity(queryEmbedding, embeddingArray)
        : 0;

      // Log when embeddings are missing for debugging
      if (!embeddingArray || !Array.isArray(embeddingArray)) {
        log.debug({
          memoryId: memory.id,
          hasEmbedding: !!memory.embedding
        }, 'Memory missing valid embedding - using zero similarity');
      }

      // 2. Recency score (30%) - exponential decay over 30 days
      const ageMs = now - memory.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageDays / 30); // Decays to ~0.37 after 30 days

      // 3. Importance score (10%) - normalized to 0-1, with clamping
      const importanceScore = Math.min(Math.max(memory.importance || 5, 1), 10) / 10;

      // Weighted combination
      const finalScore =
        (similarity * SIMILARITY_WEIGHT) +
        (recencyScore * RECENCY_WEIGHT) +
        (importanceScore * IMPORTANCE_WEIGHT);

      return {
        ...memory,
        relevanceScore: finalScore,
        _debug: {
          similarity: similarity.toFixed(3),
          recency: recencyScore.toFixed(3),
          importance: importanceScore.toFixed(3)
        }
      };
    });

    // Sort by relevance and take top K
    const topMemories = scoredMemories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, TOP_K);

    // Update access metadata with proper error handling
    if (topMemories.length > 0) {
      try {
        await prisma.memory.updateMany({
          where: {
            id: { in: topMemories.map(m => m.id) }
          },
          data: {
            lastAccessedAt: new Date(),
            accessCount: { increment: 1 }
          }
        });
      } catch (error) {
        // Log but don't throw - metadata updates shouldn't break retrieval
        log.error({ error }, 'Failed to update memory access metadata');
      }
    }

    log.info({
      duration: timer(),
      totalMemories: memories.length,
      retrievedMemories: topMemories.length,
      topScore: topMemories[0]?.relevanceScore.toFixed(3),
      topMemory: topMemories[0]?.content.substring(0, 50),
    }, 'Memory retrieval completed');

    // Remove debug info before returning
    const cleanMemories = topMemories.map(({ _debug, ...memory }) => memory);

    return {
      memories: cleanMemories as MemoryRecord[],
      totalRelevant: topMemories.length,
    };

  } catch (error) {
    logError(log, error, { duration: timer() }, 'Memory retrieval failed');

    // Don't throw - return empty memories so conversation continues
    // Log the error for monitoring but don't break the flow
    return { memories: [], totalRelevant: 0 };
  }
}
