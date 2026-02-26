/**
 * OpenAI Embeddings Utility
 *
 * Generates semantic embeddings for text using OpenAI's text-embedding-3-small model.
 * Embeddings enable semantic search and similarity matching for the memory system.
 */

import { env } from '@/lib/env';

/**
 * Generate an embedding vector for given text
 *
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 * Cost: ~$0.02 per 1M tokens (~$0.0001 per memory)
 *
 * @param text - Text to generate embedding for
 * @returns 1536-dimensional embedding vector
 * @throws Error if API request fails
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text.trim(),
        model: 'text-embedding-3-small' // 1536 dimensions, cheaper than ada-002
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embeddings API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Invalid response structure from OpenAI embeddings API');
    }

    const embedding = data.data[0].embedding;

    // Validate embedding is a proper 1536-dim vector
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error(`Expected 1536-dimensional embedding, got ${embedding?.length}`);
    }

    return embedding;

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Embedding generation failed: ${String(error)}`);
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 *
 * Cosine similarity measures the angle between two vectors,
 * ranging from -1 (opposite) to 1 (identical).
 * For normalized vectors (like OpenAI embeddings), values are typically 0-1.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score (0-1, where 1 is most similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  if (a.length === 0) {
    return 0;
  }

  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  // Calculate magnitudes
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Avoid division by zero
  if (magA === 0 || magB === 0) {
    return 0;
  }

  // Calculate cosine similarity
  return dotProduct / (magA * magB);
}

/**
 * Batch generate embeddings for multiple texts (optional utility)
 *
 * More efficient than generating embeddings one-by-one when processing
 * multiple memories at once.
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors in same order as input
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts and track indices
  const validTexts = texts.map((t, i) => ({ text: t.trim(), index: i })).filter(t => t.text.length > 0);

  if (validTexts.length === 0) {
    throw new Error('No valid texts to generate embeddings for');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: validTexts.map(t => t.text),
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embeddings API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response structure from OpenAI embeddings API');
    }

    // Extract embeddings and ensure they match original order
    return data.data.map((item: any) => item.embedding);

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Batch embedding generation failed: ${String(error)}`);
  }
}
