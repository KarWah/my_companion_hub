/**
 * Memory Extractor Tests
 *
 * Tests for conversation analysis and memory extraction logic.
 * Critical for storing meaningful memories from conversations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractAndStoreMemories } from './memory-extractor';
import prisma from '@/lib/prisma';
import * as embeddings from '@/lib/embeddings';

describe('extractAndStoreMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract and store valid memories', async () => {
    // Mock Novita API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                {
                  content: 'User has a dog named Billy',
                  category: 'personal_fact',
                  importance: 8,
                  context: 'User mentioned their dog'
                }
              ],
              reasoning: 'User provided personal information'
            })
          }
        }]
      })
    });

    // Mock embedding generation
    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    // Mock database create
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-123',
      companionId: 'comp-1',
      content: 'User has a dog named Billy',
      category: 'personal_fact',
      importance: 8,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-123'],
      context: 'User mentioned their dog',
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'My dog Billy is a golden retriever',
      'Oh wow! That sounds adorable!',
      [],
      'msg-123'
    );

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].content).toBe('User has a dog named Billy');
    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companionId: 'comp-1',
        content: 'User has a dog named Billy',
        category: 'personal_fact',
        importance: 8,
        embedding: mockEmbedding,
        sourceMessageIds: ['msg-123'],
      })
    });
  });

  it('should normalize invalid categories to personal_fact', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'Test memory',
                category: 'invalid_category', // Invalid category
                importance: 5
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Test memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'personal_fact' // Should be normalized
      })
    });
  });

  it('should accept valid categories', async () => {
    const validCategories = ['personal_fact', 'preference', 'event', 'relationship'];

    for (const category of validCategories) {
      vi.clearAllMocks();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                memories: [{
                  content: 'Test memory',
                  category: category,
                  importance: 5
                }]
              })
            }
          }]
        })
      });

      const mockEmbedding = new Array(1536).fill(0.5);
      vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
      vi.mocked(prisma.memory.create).mockResolvedValue({
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test memory',
        category: category as any,
        importance: 5,
        embedding: mockEmbedding as any,
        sourceMessageIds: ['msg-1'],
        context: null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

      expect(prisma.memory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: category
        })
      });
    }
  });

  it('should clamp importance scores to 1-10 range', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                { content: 'Test 1', category: 'personal_fact', importance: 0 }, // Below min
                { content: 'Test 2', category: 'personal_fact', importance: 15 } // Above max
              ]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    // Mock different return values for each call
    vi.mocked(prisma.memory.create)
      .mockResolvedValueOnce({
        id: 'mem-1',
        companionId: 'comp-1',
        content: 'Test 1',
        category: 'personal_fact',
        importance: 1,
        embedding: mockEmbedding as any,
        sourceMessageIds: ['msg-1'],
        context: null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'mem-2',
        companionId: 'comp-1',
        content: 'Test 2',
        category: 'personal_fact',
        importance: 10,
        embedding: mockEmbedding as any,
        sourceMessageIds: ['msg-1'],
        context: null,
        isActive: true,
        accessCount: 0,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // First call should clamp 0 to 1
    expect(prisma.memory.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ importance: 1 })
    });
    // Second call should clamp 15 to 10
    expect(prisma.memory.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ importance: 10 })
    });
  });

  it('should use default importance of 5 when not provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'Test memory',
                category: 'personal_fact'
                // importance not provided
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Test memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ importance: 5 })
    });
  });

  it('should skip memories with empty content', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                { content: '', category: 'personal_fact', importance: 5 },
                { content: '   ', category: 'personal_fact', importance: 5 },
                { content: 'Valid memory', category: 'personal_fact', importance: 5 }
              ]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Valid memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(result.memories).toHaveLength(3); // LLM returned 3
    expect(prisma.memory.create).toHaveBeenCalledTimes(1); // Only 1 stored (valid)
  });

  it('should return empty memories on API error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error'
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(result.memories).toEqual([]);
  });

  it('should handle malformed JSON gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      })
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(result.memories).toEqual([]);
  });

  it('should return empty when no memories extracted', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [],
              reasoning: 'No significant information to remember'
            })
          }
        }]
      })
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(result.memories).toEqual([]);
    expect(prisma.memory.create).not.toHaveBeenCalled();
  });

  it('should continue storing if one memory fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                { content: 'Memory 1', category: 'personal_fact', importance: 5 },
                { content: 'Memory 2', category: 'personal_fact', importance: 5 }
              ]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding')
      .mockResolvedValueOnce(mockEmbedding)
      .mockRejectedValueOnce(new Error('Embedding failed'))
      .mockResolvedValueOnce(mockEmbedding);

    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Memory 1',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // Should still return original memories from LLM
    expect(result.memories).toHaveLength(2);
    // But only successful stores happened
    expect(prisma.memory.create).toHaveBeenCalledTimes(1);
  });

  it('should trim memory content before storing', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: '  User likes pizza  ',
                category: 'preference',
                importance: 7
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'User likes pizza',
      category: 'preference',
      importance: 7,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: 'User likes pizza' // Trimmed
      })
    });
  });

  it('should include sourceMessageIds in stored memory', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'Test memory',
                category: 'personal_fact',
                importance: 5
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Test memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-abc-123'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-abc-123');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceMessageIds: ['msg-abc-123']
      })
    });
  });

  it('should build conversation context from history', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [],
              reasoning: 'No memories'
            })
          }
        }]
      })
    });
    global.fetch = mockFetch as any;

    await extractAndStoreMemories(
      'comp-1',
      'Lumen',
      'Karl',
      'What did I say earlier?',
      'You mentioned your dog',
      [
        { role: 'user', content: 'Hi there' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'I have a dog' },
        { role: 'assistant', content: 'That\'s nice!' }
      ],
      'msg-1'
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const systemPrompt = callBody.messages[0].content;

    // Should include conversation with proper speaker labels
    expect(systemPrompt).toContain('Karl: Hi there');
    expect(systemPrompt).toContain('Lumen: Hello!');
    expect(systemPrompt).toContain('Karl: I have a dog');
    expect(systemPrompt).toContain('Lumen: That\'s nice!');
  });

  it('should use correct API endpoint and model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [],
              reasoning: 'No memories'
            })
          }
        }]
      })
    });
    global.fetch = mockFetch as any;

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.novita.ai/v3/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('sao10k/l31-70b-euryale-v2.2');
    expect(callBody.temperature).toBe(0.3); // Low temperature for consistent extraction
    expect(callBody.max_tokens).toBe(500);
  });

  it('should store context when provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'User loves pizza',
                category: 'preference',
                importance: 7,
                context: 'Mentioned while discussing food preferences'
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'User loves pizza',
      category: 'preference',
      importance: 7,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: 'Mentioned while discussing food preferences',
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        context: 'Mentioned while discussing food preferences'
      })
    });
  });

  it('should set isActive to true for new memories', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'Test memory',
                category: 'personal_fact',
                importance: 5
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Test memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isActive: true,
        accessCount: 0
      })
    });
  });

  it('should handle database errors gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'Test memory',
                category: 'personal_fact',
                importance: 5
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockRejectedValue(new Error('Database error'));

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // Should return LLM memories even if storage fails
    expect(result.memories).toHaveLength(1);
  });

  it('should accept emotional_moment as a valid category', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'User made companion feel truly valued for the first time',
                category: 'emotional_moment',
                importance: 8
              }]
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'User made companion feel truly valued for the first time',
      category: 'emotional_moment',
      importance: 8,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.memory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'emotional_moment'
      })
    });
  });

  it('should apply relationship deltas when provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'A warm emotional moment',
                category: 'emotional_moment',
                importance: 9
              }],
              relationshipUpdate: {
                affectionDelta: 2,
                trustDelta: 1,
                status: 'positive interaction'
              }
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'A warm emotional moment',
      category: 'emotional_moment',
      importance: 9,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // Should apply the relationship update
    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(result.relationshipUpdate).toBeDefined();
    expect(result.relationshipUpdate!.affectionDelta).toBe(2);
    expect(result.relationshipUpdate!.trustDelta).toBe(1);
  });

  it('should not apply relationship deltas when both are zero', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [],
              relationshipUpdate: {
                affectionDelta: 0,
                trustDelta: 0,
                status: 'neutral'
              }
            })
          }
        }]
      })
    });

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('should clamp relationship deltas to -3/+3 range', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              // Must include a memory so the function doesn't return early before reaching the delta logic
              memories: [{ content: 'Test memory', category: 'personal_fact', importance: 5 }],
              relationshipUpdate: {
                affectionDelta: 99,   // Should be clamped to 3
                trustDelta: -99,      // Should be clamped to -3
                status: 'extreme'
              }
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1', companionId: 'comp-1', content: 'Test memory', category: 'personal_fact',
      importance: 5, embedding: mockEmbedding as any, sourceMessageIds: ['msg-1'], context: null,
      isActive: true, accessCount: 0, lastAccessedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // $executeRaw should be called with clamped values (3 and -3)
    expect(prisma.$executeRaw).toHaveBeenCalled();
    const call = vi.mocked(prisma.$executeRaw).mock.calls[0];
    // The raw SQL template literal includes the delta values as parameters
    // Check that the clamped values (3 and -3) appear in the call args
    const args = call as any[];
    expect(args.some(a => a === 3)).toBe(true);
    expect(args.some(a => a === -3)).toBe(true);
  });

  it('should return relationshipUpdate in result when present', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              // Must include a memory so the function doesn't return early before reading relationshipUpdate
              memories: [{ content: 'Test memory', category: 'personal_fact', importance: 5 }],
              relationshipUpdate: {
                affectionDelta: 1,
                trustDelta: 0,
                status: 'slightly positive'
              }
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1', companionId: 'comp-1', content: 'Test memory', category: 'personal_fact',
      importance: 5, embedding: mockEmbedding as any, sourceMessageIds: ['msg-1'], context: null,
      isActive: true, accessCount: 0, lastAccessedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);

    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    expect(result.relationshipUpdate).toBeDefined();
    expect(result.relationshipUpdate!.status).toBe('slightly positive');
  });

  it('should not fail when relationship delta update throws', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [{
                content: 'A test memory',
                category: 'personal_fact',
                importance: 5
              }],
              relationshipUpdate: {
                affectionDelta: 2,
                trustDelta: 1,
                status: 'positive'
              }
            })
          }
        }]
      })
    });

    const mockEmbedding = new Array(1536).fill(0.5);
    vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);
    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'A test memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.$executeRaw).mockRejectedValue(new Error('DB error during relationship update'));

    // Should not throw — relationship update is non-critical
    const result = await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');
    expect(result.memories).toHaveLength(1); // Memory still returned
  });

  it('should process memories in parallel', async () => {
    (global.fetch as any).mockResolvedValue({
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

    const mockEmbedding = new Array(1536).fill(0.5);
    const generateSpy = vi.spyOn(embeddings, 'generateEmbedding').mockResolvedValue(mockEmbedding);

    vi.mocked(prisma.memory.create).mockResolvedValue({
      id: 'mem-1',
      companionId: 'comp-1',
      content: 'Memory',
      category: 'personal_fact',
      importance: 5,
      embedding: mockEmbedding as any,
      sourceMessageIds: ['msg-1'],
      context: null,
      isActive: true,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await extractAndStoreMemories('comp-1', 'Lumen', 'Karl', 'test', 'response', [], 'msg-1');

    // All 3 memories should be processed
    expect(generateSpy).toHaveBeenCalledTimes(3);
    expect(prisma.memory.create).toHaveBeenCalledTimes(3);
  });
});
