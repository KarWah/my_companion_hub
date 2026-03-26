/**
 * Memory System Integration Tests
 *
 * Tests the complete memory lifecycle: extraction → storage → retrieval
 * Ensures the memory system works end-to-end as expected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractAndStoreMemories } from '@/temporal/activities/memory-extractor';
import { retrieveRelevantMemories } from '@/temporal/activities/memory-retriever';
import prisma from '@/lib/prisma';
import * as embeddings from '@/lib/embeddings';

describe('Memory System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full memory lifecycle: extract → store → retrieve', async () => {
    // Setup: Create mock embeddings for memories
    const pizzaEmbedding = new Array(1536).fill(0.6);
    const colorEmbedding = new Array(1536).fill(0.7);
    const queryEmbedding = new Array(1536).fill(0.65); // Similar to pizza

    // Step 1: Extract and store memories
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                {
                  content: 'User loves pizza',
                  category: 'preference',
                  importance: 8
                },
                {
                  content: 'User favorite color is blue',
                  category: 'preference',
                  importance: 7
                }
              ],
              reasoning: 'User shared personal preferences'
            })
          }
        }]
      })
    });

    // Mock embedding generation for extraction
    const generateSpy = vi.spyOn(embeddings, 'generateEmbedding')
      .mockResolvedValueOnce(pizzaEmbedding) // First memory
      .mockResolvedValueOnce(colorEmbedding); // Second memory

    const storedMemory1 = {
      id: 'mem-pizza',
      companionId: 'comp-1',
      content: 'User loves pizza',
      category: 'preference' as const,
      importance: 8,
      embedding: pizzaEmbedding,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const storedMemory2 = {
      id: 'mem-color',
      companionId: 'comp-1',
      content: 'User favorite color is blue',
      category: 'preference' as const,
      importance: 7,
      embedding: colorEmbedding,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.memory.create)
      .mockResolvedValueOnce(storedMemory1 as any)
      .mockResolvedValueOnce(storedMemory2 as any);

    const extracted = await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'I love pizza and my favorite color is blue',
      'That\'s great! Pizza is delicious.',
      [],
      'msg-1'
    );

    expect(extracted.memories).toHaveLength(2);
    expect(prisma.memory.create).toHaveBeenCalledTimes(2);

    // Step 2: Retrieve relevant memories
    generateSpy.mockResolvedValueOnce(queryEmbedding); // For retrieval query

    vi.mocked(prisma.memory.findMany).mockResolvedValue([
      storedMemory1,
      storedMemory2
    ] as any);

    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const retrieved = await retrieveRelevantMemories(
      'comp-1',
      'What food do I like?'
    );

    expect(retrieved.memories.length).toBeGreaterThan(0);
    expect(retrieved.memories.some(m => m.content.includes('pizza'))).toBe(true);

    // Verify access metadata was updated
    expect(prisma.memory.updateMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining([expect.any(String)]) } },
      data: {
        lastAccessedAt: expect.any(Date),
        accessCount: { increment: 1 }
      }
    });
  });

  it('should handle companion isolation (memories don\'t leak between companions)', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);

    // Create memory for companion A
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'User secret for companion A',
                category: 'personal_fact',
                importance: 10
              }]
            })
          }
        }]
      })
    });

    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-a',
      companionId: 'comp-a',
      content: 'User secret for companion A',
      category: 'personal_fact',
      importance: 10,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await extractAndStoreMemories(
      'comp-a',
      'Alice',
      'User',
      'This is secret info',
      'I understand',
      [],
      'msg-1'
    );

    // Try to retrieve from companion B
    vi.mocked(prisma.memory.findMany).mockResolvedValue([]); // No memories for comp-b

    const retrieved = await retrieveRelevantMemories(
      'comp-b',
      'What do you know about me?'
    );

    expect(retrieved.memories).toEqual([]);
    expect(prisma.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companionId: 'comp-b', // Should only query for comp-b
          isActive: true
        }
      })
    );
  });

  it('should rank recent memories higher than old ones with same importance', async () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    const oldMemory = {
      id: 'mem-old',
      companionId: 'comp-1',
      content: 'Old memory',
      category: 'personal_fact' as const,
      importance: 5,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-old'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: oneMonthAgo,
      createdAt: oneMonthAgo,
      updatedAt: oneMonthAgo,
    };

    const recentMemory = {
      id: 'mem-recent',
      companionId: 'comp-1',
      content: 'Recent memory',
      category: 'personal_fact' as const,
      importance: 5,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-recent'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    vi.mocked(prisma.memory.findMany).mockResolvedValue([oldMemory, recentMemory] as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const retrieved = await retrieveRelevantMemories('comp-1', 'test query');

    expect(retrieved.memories).toHaveLength(2);

    // Recent memory should rank higher (first in the array)
    expect(retrieved.memories[0].id).toBe('mem-recent');
    expect(retrieved.memories[1].id).toBe('mem-old');
  });

  it('should prioritize high importance memories', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    const lowImportance = {
      id: 'mem-low',
      companionId: 'comp-1',
      content: 'Low importance memory',
      category: 'personal_fact' as const,
      importance: 2,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const highImportance = {
      id: 'mem-high',
      companionId: 'comp-1',
      content: 'High importance memory',
      category: 'personal_fact' as const,
      importance: 10,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-2'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.memory.findMany).mockResolvedValue([lowImportance, highImportance] as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 2 });

    const retrieved = await retrieveRelevantMemories('comp-1', 'test query');

    expect(retrieved.memories).toHaveLength(2);

    // High importance should rank first
    expect(retrieved.memories[0].id).toBe('mem-high');
    expect(retrieved.memories[1].id).toBe('mem-low');
  });

  it('should handle extraction failure gracefully without breaking retrieval', async () => {
    // Extraction fails
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error'
    });

    const extracted = await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'test message',
      'test response',
      [],
      'msg-1'
    );

    expect(extracted.memories).toEqual([]);

    // But retrieval should still work with existing memories
    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    vi.mocked(prisma.memory.findMany).mockResolvedValue([
      {
        id: 'mem-existing',
        companionId: 'comp-1',
        content: 'Existing memory',
        category: 'personal_fact',
        importance: 5,
        embedding: mockEmbedding,
        sourceMessageIds: ['msg-old'],
        context: null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ] as any);

    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const retrieved = await retrieveRelevantMemories('comp-1', 'test query');

    expect(retrieved.memories).toHaveLength(1);
    expect(retrieved.memories[0].content).toBe('Existing memory');
  });

  it('should filter out inactive memories during retrieval', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    // Mock findMany to only return active memories
    vi.mocked(prisma.memory.findMany).mockResolvedValue([
      {
        id: 'mem-active',
        companionId: 'comp-1',
        content: 'Active memory',
        category: 'personal_fact',
        importance: 5,
        embedding: mockEmbedding,
        sourceMessageIds: ['msg-1'],
        context: null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ] as any);

    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    await retrieveRelevantMemories('comp-1', 'test query');

    // Verify the query included isActive filter
    expect(prisma.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companionId: 'comp-1',
          isActive: true
        }
      })
    );
  });

  it('should successfully store and retrieve memories with context', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    const generateSpy = vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    // Extract memory with context
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'User birthday is May 15th',
                category: 'personal_fact',
                importance: 10,
                context: 'Mentioned during birthday discussion'
              }]
            })
          }
        }]
      })
    });

    const memoryWithContext = {
      id: 'mem-bday',
      companionId: 'comp-1',
      content: 'User birthday is May 15th',
      category: 'personal_fact' as const,
      importance: 10,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-1'],
      context: 'Mentioned during birthday discussion',
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.memory.create).mockResolvedValue(memoryWithContext as any);

    const extracted = await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'My birthday is May 15th',
      'I\'ll remember that!',
      [],
      'msg-1'
    );

    expect(extracted.memories[0].context).toBe('Mentioned during birthday discussion');

    // Retrieve and verify context is preserved
    vi.mocked(prisma.memory.findMany).mockResolvedValue([memoryWithContext] as any);
    vi.mocked(prisma.memory.updateMany).mockResolvedValue({ count: 1 });

    const retrieved = await retrieveRelevantMemories('comp-1', 'When is my birthday?');

    expect(retrieved.memories[0].context).toBe('Mentioned during birthday discussion');
  });

  it('should handle parallel memory storage correctly', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    // Extract multiple memories at once
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                { content: 'Memory 1', category: 'personal_fact', importance: 5 },
                { content: 'Memory 2', category: 'preference', importance: 7 },
                { content: 'Memory 3', category: 'event', importance: 6 }
              ]
            })
          }
        }]
      })
    });

    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const extracted = await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'Complex message with multiple facts',
      'I understand all of that',
      [],
      'msg-1'
    );

    expect(extracted.memories).toHaveLength(3);
    expect(prisma.memory.create).toHaveBeenCalledTimes(3);
    expect(embeddings.generateEmbedding).toHaveBeenCalledTimes(3);
  });
});
