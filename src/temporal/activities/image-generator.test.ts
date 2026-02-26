/**
 * Image Generator Activity Tests
 *
 * Tests the simplified SD API wrapper. Prompt construction has moved to
 * sd-prompt-generator.ts — this activity just calls the SD API and uploads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCompanionImage } from './image-generator';
import * as storage from '@/lib/storage';

vi.mock('@/lib/storage', () => ({
  uploadImage: vi.fn()
}));

const MOCK_POSITIVE = '(masterpiece, best quality:1.2), (1girl, solo), (long black hair:1.2), red dress, sitting, smiling, (park), soft lighting';
const MOCK_NEGATIVE = '(bad quality:1.15), (worst quality:1.3), neghands, monochrome';

describe('generateCompanionImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call SD API and return uploaded image URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: ['base64imagedata'] })
    });
    global.fetch = mockFetch as any;

    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://storage.com/image.webp',
      path: 'companions/comp-1/image.webp',
      filename: 'image.webp',
      sizeBytes: 50000,
      originalSizeBytes: 100000,
      compressionRatio: 0.5
    });

    const result = await generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28);

    expect(result).toBe('https://storage.com/image.webp');
    expect(storage.uploadImage).toHaveBeenCalledWith(
      'data:image/jpeg;base64,base64imagedata',
      'comp-1',
      'companion-generated'
    );
  });

  it('should pass positive and negative prompts to the SD API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: ['base64'] })
    });
    global.fetch = mockFetch as any;

    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://storage.com/image.webp',
      path: 'companions/comp-1/image.webp',
      filename: 'image.webp',
      sizeBytes: 50000,
      originalSizeBytes: 100000,
      compressionRatio: 0.5
    });

    await generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.prompt).toBe(MOCK_POSITIVE);
    expect(callBody.negative_prompt).toBe(MOCK_NEGATIVE);
  });

  it('should pass cfg_scale and steps from arguments', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: ['base64'] })
    });
    global.fetch = mockFetch as any;

    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://storage.com/image.webp',
      path: 'companions/comp-1/image.webp',
      filename: 'image.webp',
      sizeBytes: 50000,
      originalSizeBytes: 100000,
      compressionRatio: 0.5
    });

    await generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 7, 30);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.cfg_scale).toBe(7);
    expect(callBody.steps).toBe(30);
  });

  it('should use fixed image dimensions and sampler', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: ['base64'] })
    });
    global.fetch = mockFetch as any;

    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://storage.com/image.webp',
      path: 'companions/comp-1/image.webp',
      filename: 'image.webp',
      sizeBytes: 50000,
      originalSizeBytes: 100000,
      compressionRatio: 0.5
    });

    await generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.width).toBe(832);
    expect(callBody.height).toBe(1216);
    expect(callBody.sampler_name).toBe('DPM++ 2M');
    expect(callBody.scheduler).toBe('karras');
    expect(callBody.seed).toBe(-1);
  });

  it('should use the correct SD API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ images: ['base64'] })
    });
    global.fetch = mockFetch as any;

    vi.mocked(storage.uploadImage).mockResolvedValue({
      url: 'https://storage.com/image.webp',
      path: 'companions/comp-1/image.webp',
      filename: 'image.webp',
      sizeBytes: 50000,
      originalSizeBytes: 100000,
      compressionRatio: 0.5
    });

    await generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:7860/sdapi/v1/txt2img',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw when SD API returns an error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error'
    });

    await expect(
      generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28)
    ).rejects.toThrow('SD API Error (500)');
  });

  it('should throw when SD API call fails with a network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network timeout'));

    await expect(
      generateCompanionImage('comp-1', MOCK_POSITIVE, MOCK_NEGATIVE, 6, 28)
    ).rejects.toThrow('Network timeout');
  });
});
