import { describe, it, expect } from 'vitest';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from './validators';

describe('validators constants', () => {
  it('should have MAX_FILE_SIZE defined', () => {
    expect(MAX_FILE_SIZE).toBeDefined();
    expect(typeof MAX_FILE_SIZE).toBe('number');
    expect(MAX_FILE_SIZE).toBeGreaterThan(0);
  });

  it('should have ALLOWED_MIME_TYPES defined', () => {
    expect(ALLOWED_MIME_TYPES).toBeDefined();
    expect(Array.isArray(ALLOWED_MIME_TYPES)).toBe(true);
    expect(ALLOWED_MIME_TYPES.length).toBeGreaterThan(0);
  });

  it('should allow common image types', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
  });

  it('should have reasonable file size limit (between 1MB and 20MB)', () => {
    const oneMB = 1024 * 1024;
    const twentyMB = 20 * 1024 * 1024;
    expect(MAX_FILE_SIZE).toBeGreaterThanOrEqual(oneMB);
    expect(MAX_FILE_SIZE).toBeLessThanOrEqual(twentyMB);
  });
});

describe('file validation logic', () => {
  it('should validate file size correctly', () => {
    const smallFile = { size: 1024 }; // 1KB
    const largeFile = { size: MAX_FILE_SIZE + 1 };

    expect(smallFile.size <= MAX_FILE_SIZE).toBe(true);
    expect(largeFile.size <= MAX_FILE_SIZE).toBe(false);
  });

  it('should validate file types correctly', () => {
    const jpegFile = { type: 'image/jpeg' };
    const pdfFile = { type: 'application/pdf' };

    expect(ALLOWED_MIME_TYPES.includes(jpegFile.type)).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes(pdfFile.type)).toBe(false);
  });

  it('should validate both size and type', () => {
    const validFile = {
      type: 'image/jpeg',
      size: 1024 * 1024 // 1MB
    };
    const invalidSizeFile = {
      type: 'image/jpeg',
      size: MAX_FILE_SIZE + 1
    };
    const invalidTypeFile = {
      type: 'application/pdf',
      size: 1024
    };

    expect(
      ALLOWED_MIME_TYPES.includes(validFile.type) && validFile.size <= MAX_FILE_SIZE
    ).toBe(true);
    expect(
      ALLOWED_MIME_TYPES.includes(invalidSizeFile.type) && invalidSizeFile.size <= MAX_FILE_SIZE
    ).toBe(false);
    expect(
      ALLOWED_MIME_TYPES.includes(invalidTypeFile.type) && invalidTypeFile.size <= MAX_FILE_SIZE
    ).toBe(false);
  });
});
