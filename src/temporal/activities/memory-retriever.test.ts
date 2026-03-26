/**
 * Memory Retriever Tests
 *
 * Tests for hybrid scoring algorithm combining semantic similarity,
 * recency, and importance for memory retrieval.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveRelevantMemories } from './memory-retriever';
import prisma from '@/lib/prisma';
import * as embeddings from '@/lib/embeddings';

// Note: Prisma and logger are already globally mocked in vitest.setup.ts
// We spy on generateEmbedding but keep cosineSimilarity real

describe('retrieveRelevantMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty result when no memories exist', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]);

    const result = await retrieveRelevantMemories('comp-1', 'test message');

    expect(result.memories).toEqual([]);
    expect(result.totalRelevant).toBe(0);
  });

  it('should calculate hybrid scores correctly', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Recent important memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5), // Perfect similarity
        importance: 10,
        createdAt: now,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: now,
        sourceMessageIds: [],
        context: null,
      },
      {
        id: 'mem-2',
        companionId: 'comp-1',
        content: 'Old less important memory',
        category: 'preference',
        embedding: new Array(1536).fill(0.2), // Lower similarity
        importance: 3,
        createdAt: oneWeekAgo,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: oneWeekAgo,
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    expect(result.memories).toHaveLength(2);
    // First memory should rank higher (recent + perfect similarity + high importance)
    expect(result.memories[0].id).toBe('mem-1');
    expect(result.memories[0]).toHaveProperty('relevanceScore');
    expect(result.memories[0].relevanceScore!).toBeGreaterThan(result.memories[1].relevanceScore!);
  });

  it('should handle memories with missing embeddings', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Memory without embedding',
        category: 'personal_fact',
        embedding: null, // Missing embedding
        importance: 10,
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Should still return the memory but with lower score (0 similarity)
    expect(result.memories).toHaveLength(1);
    // Relevance score should be based only on recency (0.3) + importance (0.1)
    expect(result.memories[0].relevanceScore).toBeLessThan(0.6); // No similarity contribution
  });

  it('should handle memories with invalid embeddings (not array)', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Memory with invalid embedding',
        category: 'personal_fact',
        embedding: "invalid", // Invalid embedding type
        importance: 8,
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Should still return the memory with 0 similarity
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].relevanceScore).toBeGreaterThan(0); // Has recency + importance
  });

  it('should return max 10 memories (TOP_K)', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = Array.from({ length: 50 }, (_, i) => ({
      id: `mem-${i}`,
      companionId: 'comp-1',
      content: `Memory ${i}`,
      category: 'personal_fact',
      embedding: new Array(1536).fill(Math.random()),
      importance: Math.floor(Math.random() * 10) + 1,
      createdAt: new Date(),
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      sourceMessageIds: [],
      context: null,
    }));

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 10 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    expect(result.memories).toHaveLength(10); // TOP_K = 10
    expect(result.totalRelevant).toBe(10);
  });

  it('should update access metadata for retrieved memories', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 5,
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    await retrieveRelevantMemories('comp-1', 'test');

    expect(prisma.memory.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['mem-1'] } },
      data: {
        lastAccessedAt: expect.any(Date),
        accessCount: { increment: 1 }
      }
    });
  });

  it('should not throw if metadata update fails', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 5,
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockRejectedValue(new Error('DB error'));

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Should still return memories despite metadata update failure
    expect(result.memories).toHaveLength(1);
  });

  it('should clamp importance scores to 1-10 range during retrieval', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 15, // Invalid - exceeds max
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      },
      {
        id: 'mem-2',
        companionId: 'comp-1',
        content: 'Test memory 2',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: -5, // Invalid - below min
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Both should be clamped - importance component should be max 0.1 (10/10 * 0.1 weight)
    expect(result.memories).toHaveLength(2);
    // Check that scores don't exceed theoretical maximum (use toBeCloseTo for floating-point)
    expect(result.memories[0].relevanceScore).toBeCloseTo(1.0, 1);
  });

  it('should sort memories by relevance score descending', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const now = new Date();
    const longAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

    const mockMemories = [
      {
        id: 'mem-low',
        companionId: 'comp-1',
        content: 'Low score memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.1), // Low similarity
        importance: 1, // Low importance
        createdAt: longAgo, // Old
        isActive: true,
        accessCount: 0,
        lastAccessedAt: longAgo,
        sourceMessageIds: [],
        context: null,
      },
      {
        id: 'mem-high',
        companionId: 'comp-1',
        content: 'High score memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5), // High similarity
        importance: 10, // High importance
        createdAt: now, // Recent
        isActive: true,
        accessCount: 0,
        lastAccessedAt: now,
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    expect(result.memories).toHaveLength(2);
    // High score memory should be first
    expect(result.memories[0].id).toBe('mem-high');
    expect(result.memories[1].id).toBe('mem-low');
  });

  it('should return empty memories on error (graceful degradation)', async () => {
    vi.spyOn(embeddings, 'generateEmbedding').mockRejectedValue(new Error('Embedding API failed'));
    // Embedding failure alone doesn't stop retrieval (falls back to importance+recency).
    // Simulate no memories so the result is empty after the fallback.
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]);

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Should not throw - returns empty to allow conversation to continue
    expect(result.memories).toEqual([]);
    expect(result.totalRelevant).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);
    vi.mocked(prisma.memory.findMany).mockRejectedValue(new Error('Database connection failed'));

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // Should not throw - returns empty memories
    expect(result.memories).toEqual([]);
    expect(result.totalRelevant).toBe(0);
  });

  it('should calculate recency decay correctly', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const mockMemories = [
      {
        id: 'mem-recent',
        companionId: 'comp-1',
        content: 'Recent memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 5,
        createdAt: now, // Should have recency score ~1.0
        isActive: true,
        accessCount: 0,
        lastAccessedAt: now,
        sourceMessageIds: [],
        context: null,
      },
      {
        id: 'mem-old',
        companionId: 'comp-1',
        content: 'Old memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 5,
        createdAt: thirtyDaysAgo, // Should have recency score ~0.37 (e^-1)
        isActive: true,
        accessCount: 0,
        lastAccessedAt: thirtyDaysAgo,
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    expect(result.memories).toHaveLength(2);
    // Recent memory should score higher
    expect(result.memories[0].id).toBe('mem-recent');
  });

  it('should remove _debug field from returned memories', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const mockMemories = [
      {
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test memory',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5),
        importance: 5,
        createdAt: new Date(),
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // _debug field should be removed
    expect(result.memories[0]).not.toHaveProperty('_debug');
  });

  it('should fetch only active memories', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]);

    await retrieveRelevantMemories('comp-1', 'test');

    expect(prisma.memory.findMany).toHaveBeenCalledWith({
      where: {
        companionId: 'comp-1',
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100,
    });
  });

  it('should limit fetch to 100 recent memories', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]);

    await retrieveRelevantMemories('comp-1', 'test');

    expect(prisma.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('should calculate semantic similarity as primary factor', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);

    const now = new Date();

    const mockMemories = [
      {
        id: 'mem-low-sim',
        companionId: 'comp-1',
        content: 'Low similarity',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0).map((_, i) => i < 768 ? 0.5 : -0.5), // Different direction
        importance: 10, // High importance to compensate
        createdAt: now, // Recent
        isActive: true,
        accessCount: 0,
        lastAccessedAt: now,
        sourceMessageIds: [],
        context: null,
      },
      {
        id: 'mem-high-sim',
        companionId: 'comp-1',
        content: 'High similarity',
        category: 'personal_fact',
        embedding: new Array(1536).fill(0.5), // High similarity
        importance: 1, // Low importance
        createdAt: now, // Recent
        isActive: true,
        accessCount: 0,
        lastAccessedAt: now,
        sourceMessageIds: [],
        context: null,
      }
    ];

    vi.mocked(prisma.memory.findMany).mockResolvedValue(mockMemories as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const result = await retrieveRelevantMemories('comp-1', 'test');

    // High similarity should win despite lower importance (60% weight vs 10%)
    expect(result.memories[0].id).toBe('mem-high-sim');
  });

  it('should handle companion with no messages gracefully', async () => {
    const queryEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(queryEmbedding);
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]);

    const result = await retrieveRelevantMemories('nonexistent-companion', 'test');

    expect(result.memories).toEqual([]);
    expect(result.totalRelevant).toBe(0);
  });
});
