/**
 * Embeddings Module Tests
 *
 * Tests for OpenAI embeddings generation and cosine similarity calculations.
 * Critical for memory system semantic search functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbedding, cosineSimilarity, generateEmbeddingsBatch } from './embeddings';

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 1536-dimensional array for valid text', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: mockEmbedding }]
      })
    });

    const result = await generateEmbedding('test text');

    expect(result).toHaveLength(1536);
    expect(result.every(n => typeof n === 'number')).toBe(true);
  });

  it('should throw error for empty string', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('Cannot generate embedding for empty text');
  });

  it('should throw error for whitespace-only string', async () => {
    await expect(generateEmbedding('   ')).rejects.toThrow('Cannot generate embedding for empty text');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    });

    await expect(generateEmbedding('test')).rejects.toThrow('OpenAI Embeddings API error (401)');
  });

  it('should trim input text before sending', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: new Array(1536).fill(0.5) }]
      })
    });
    global.fetch = mockFetch as any;

    await generateEmbedding('  test  ');

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.input).toBe('test'); // Trimmed
  });

  it('should use correct API endpoint and model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: new Array(1536).fill(0.5) }]
      })
    });
    global.fetch = mockFetch as any;

    await generateEmbedding('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('text-embedding-3-small');
  });

  it('should throw error for invalid response structure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [] // Empty data array
      })
    });

    await expect(generateEmbedding('test')).rejects.toThrow('Invalid response structure');
  });

  it('should throw error for wrong embedding dimensions', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: [1, 2, 3] }] // Wrong dimension
      })
    });

    await expect(generateEmbedding('test')).rejects.toThrow('Expected 1536-dimensional embedding');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(generateEmbedding('test')).rejects.toThrow('Network error');
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 0, 0];
    expect(cosineSimilarity(vec, vec)).toBe(1);
  });

  it('should return 0 for orthogonal vectors', () => {
    const result = cosineSimilarity([1, 0], [0, 1]);
    expect(result).toBeCloseTo(0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const result = cosineSimilarity([1, 1], [-1, -1]);
    expect(result).toBeCloseTo(-1, 5);
  });

  it('should handle partial similarity correctly', () => {
    const result = cosineSimilarity([1, 0, 0], [0.5, 0.5, 0.5]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
    expect(result).toBeCloseTo(0.577, 2); // sqrt(1/3) ≈ 0.577
  });

  it('should return 0 for zero-magnitude vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
    expect(cosineSimilarity([1, 1, 1], [0, 0, 0])).toBe(0);
  });

  it('should throw error for dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow("Vector dimensions don't match");
  });

  it('should return 0 for empty arrays', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('should handle normalized vs non-normalized vectors consistently', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6]; // Same direction, different magnitude
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('should handle negative values correctly', () => {
    const result = cosineSimilarity([1, -1, 0], [1, -1, 0]);
    expect(result).toBeCloseTo(1, 5); // Use toBeCloseTo for floating point
  });

  it('should handle small vectors (typical case)', () => {
    const a = [0.1, 0.2, 0.3];
    const b = [0.15, 0.25, 0.35];
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThan(0.99); // Very similar
  });

  it('should handle 1536-dimensional vectors (real use case)', () => {
    const a = new Array(1536).fill(0.5);
    const b = new Array(1536).fill(0.5);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5); // Use toBeCloseTo for floating point
  });

  it('should calculate different similarities for 1536-dim vectors', () => {
    const a = new Array(1536).fill(0.5);
    const b = a.map((_, i) => i < 768 ? 0.5 : 0.3); // Half similar
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe('generateEmbeddingsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for empty input', async () => {
    const result = await generateEmbeddingsBatch([]);
    expect(result).toEqual([]);
  });

  it('should generate embeddings for multiple texts', async () => {
    const mockEmbeddings = [
      new Array(1536).fill(0.5),
      new Array(1536).fill(0.6),
      new Array(1536).fill(0.7)
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockEmbeddings.map(embedding => ({ embedding }))
      })
    });

    const result = await generateEmbeddingsBatch(['text1', 'text2', 'text3']);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(1536);
    expect(result[1]).toHaveLength(1536);
    expect(result[2]).toHaveLength(1536);
  });

  it('should filter out empty texts', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: mockEmbedding }]
      })
    });
    global.fetch = mockFetch as any;

    await generateEmbeddingsBatch(['valid text', '', '   ']);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.input).toEqual(['valid text']); // Only valid text
  });

  it('should throw error if all texts are empty', async () => {
    await expect(generateEmbeddingsBatch(['', '  ', '\t'])).rejects.toThrow('No valid texts');
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error'
    });

    await expect(generateEmbeddingsBatch(['text1', 'text2'])).rejects.toThrow('OpenAI Embeddings API error (500)');
  });

  it('should trim all input texts', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { embedding: new Array(1536).fill(0.5) },
          { embedding: new Array(1536).fill(0.6) }
        ]
      })
    });
    global.fetch = mockFetch as any;

    await generateEmbeddingsBatch(['  text1  ', '\ttext2\n']);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.input).toEqual(['text1', 'text2']);
  });

  it('should use correct model for batch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: new Array(1536).fill(0.5) }]
      })
    });
    global.fetch = mockFetch as any;

    await generateEmbeddingsBatch(['text1']);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('text-embedding-3-small');
  });
});
