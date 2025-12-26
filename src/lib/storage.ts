/**
 * Self-Hosted Image Storage
 *
 * Industry-standard file system storage for images.
 * Follows best practices for local/self-hosted deployments.
 *
 * Key Features:
 * - Stores images as files (not in database)
 * - Organized directory structure
 * - Automatic image optimization (compression, resizing)
 * - Type-safe API
 * - Automatic cleanup of orphaned images
 * - Proper error handling
 *
 * Storage Structure:
 * public/uploads/
 *   ├── companions/{companionId}/
 *   │   ├── headers/{imageId}.jpg     # Companion header images
 *   │   └── generated/{imageId}.jpg   # AI-generated images
 *   └── tmp/                          # Temporary uploads
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { logger } from './logger';

const storageLogger = logger.child({ module: 'storage' });

// Storage configuration
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Image optimization settings
const IMAGE_QUALITY = 85; // JPEG quality (0-100)
const MAX_WIDTH = 1920;   // Max width for generated images
const MAX_HEIGHT = 1920;  // Max height for generated images
const HEADER_MAX_WIDTH = 800;  // Max width for header images
const HEADER_MAX_HEIGHT = 800; // Max height for header images

/**
 * Supported image types
 */
export type ImageType = 'companion-header' | 'companion-generated';

/**
 * Image upload result
 */
export interface ImageUploadResult {
  url: string;           // Public URL: /uploads/companions/{id}/headers/{imageId}.jpg
  path: string;          // File system path
  filename: string;      // Just the filename
  sizeBytes: number;     // Final file size after optimization
  originalSizeBytes: number; // Original size before optimization
  compressionRatio: number;  // How much we saved (0.0 - 1.0)
}

/**
 * Ensures upload directories exist
 */
async function ensureDirectories(): Promise<void> {
  const dirs = [
    UPLOAD_BASE_DIR,
    path.join(UPLOAD_BASE_DIR, 'companions'),
    path.join(UPLOAD_BASE_DIR, 'tmp'),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      storageLogger.error({ error, dir }, 'Failed to create directory');
      throw new Error(`Failed to create storage directory: ${dir}`);
    }
  }
}

/**
 * Converts base64 image to buffer
 */
function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;

  return Buffer.from(base64Data, 'base64');
}

/**
 * Validates image buffer
 */
async function validateImage(buffer: Buffer): Promise<void> {
  // Check size
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB ` +
      `(max: ${MAX_IMAGE_SIZE_MB}MB)`
    );
  }

  // Validate it's actually an image using sharp
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format) {
      throw new Error('Invalid image format');
    }
  } catch (error) {
    throw new Error('Invalid image data');
  }
}

/**
 * Optimizes and resizes image
 */
async function optimizeImage(
  buffer: Buffer,
  imageType: ImageType
): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> {
  const maxWidth = imageType === 'companion-header' ? HEADER_MAX_WIDTH : MAX_WIDTH;
  const maxHeight = imageType === 'companion-header' ? HEADER_MAX_HEIGHT : MAX_HEIGHT;

  // Process image with sharp
  const pipeline = sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true, // Don't upscale small images
    })
    .jpeg({
      quality: IMAGE_QUALITY,
      mozjpeg: true, // Use mozjpeg for better compression
    });

  const optimizedBuffer = await pipeline.toBuffer();
  const metadata = await sharp(optimizedBuffer).metadata();

  return { buffer: optimizedBuffer, metadata };
}

/**
 * Uploads an image from base64 data
 *
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @param companionId - Companion ID for organizing storage
 * @param imageType - Type of image (header or generated)
 * @returns Image upload result with URL and metadata
 */
export async function uploadImage(
  base64Image: string,
  companionId: string,
  imageType: ImageType
): Promise<ImageUploadResult> {
  const startTime = Date.now();
  const log = storageLogger.child({ companionId, imageType });

  log.debug('Starting image upload');

  try {
    // Ensure directories exist
    await ensureDirectories();

    // Convert base64 to buffer
    const originalBuffer = base64ToBuffer(base64Image);
    const originalSize = originalBuffer.length;

    log.debug({ originalSizeKB: (originalSize / 1024).toFixed(2) }, 'Image decoded');

    // Validate image
    await validateImage(originalBuffer);

    // Optimize image
    const { buffer: optimizedBuffer, metadata } = await optimizeImage(
      originalBuffer,
      imageType
    );

    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = 1 - (optimizedSize / originalSize);

    log.debug({
      originalSizeKB: (originalSize / 1024).toFixed(2),
      optimizedSizeKB: (optimizedSize / 1024).toFixed(2),
      compressionPercent: (compressionRatio * 100).toFixed(1),
      dimensions: `${metadata.width}x${metadata.height}`,
    }, 'Image optimized');

    // Generate filename
    const filename = `${nanoid()}.jpg`;

    // Determine subdirectory based on type
    const subdir = imageType === 'companion-header' ? 'headers' : 'generated';

    // Create companion directory structure
    const companionDir = path.join(UPLOAD_BASE_DIR, 'companions', companionId, subdir);
    await fs.mkdir(companionDir, { recursive: true });

    // Full file path
    const filepath = path.join(companionDir, filename);

    // Write file to disk
    await fs.writeFile(filepath, optimizedBuffer);

    // Generate public URL
    const publicUrl = `/uploads/companions/${companionId}/${subdir}/${filename}`;

    log.info({
      duration: Date.now() - startTime,
      url: publicUrl,
      sizeKB: (optimizedSize / 1024).toFixed(2),
      saved: ((compressionRatio * 100).toFixed(1)) + '%',
    }, 'Image uploaded successfully');

    return {
      url: publicUrl,
      path: filepath,
      filename,
      sizeBytes: optimizedSize,
      originalSizeBytes: originalSize,
      compressionRatio,
    };

  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, 'Image upload failed');

    throw error;
  }
}

/**
 * Deletes an image from storage
 *
 * @param imageUrl - Public URL or file path
 * @returns True if deleted, false if not found
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  const log = storageLogger.child({ imageUrl });

  try {
    // Convert URL to file path
    let filepath: string;

    if (imageUrl.startsWith('/uploads/')) {
      // Public URL format: /uploads/companions/{id}/headers/{filename}
      filepath = path.join(process.cwd(), 'public', imageUrl);
    } else if (imageUrl.startsWith('data:image')) {
      // Base64 data - nothing to delete
      log.debug('Skipping deletion of base64 data');
      return false;
    } else {
      filepath = imageUrl; // Assume it's already a file path
    }

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      log.warn('Image file not found');
      return false;
    }

    // Delete file
    await fs.unlink(filepath);

    log.info('Image deleted successfully');
    return true;

  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Image deletion failed');

    return false;
  }
}

/**
 * Deletes all images for a companion
 *
 * @param companionId - Companion ID
 * @returns Number of images deleted
 */
export async function deleteCompanionImages(companionId: string): Promise<number> {
  const log = storageLogger.child({ companionId });

  try {
    const companionDir = path.join(UPLOAD_BASE_DIR, 'companions', companionId);

    // Check if directory exists
    try {
      await fs.access(companionDir);
    } catch {
      log.debug('Companion directory not found');
      return 0;
    }

    // Count files before deletion
    let deletedCount = 0;
    const subdirs = ['headers', 'generated'];

    for (const subdir of subdirs) {
      const dirPath = path.join(companionDir, subdir);

      try {
        const files = await fs.readdir(dirPath);
        deletedCount += files.length;
      } catch {
        // Subdirectory doesn't exist, skip
      }
    }

    // Delete entire companion directory
    await fs.rm(companionDir, { recursive: true, force: true });

    log.info({ deletedCount }, 'Companion images deleted');
    return deletedCount;

  } catch (error) {
    log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to delete companion images');

    return 0;
  }
}

/**
 * Gets storage statistics
 */
export async function getStorageStats(): Promise<{
  totalImages: number;
  totalSizeBytes: number;
  companionCount: number;
}> {
  try {
    await ensureDirectories();

    const companionsDir = path.join(UPLOAD_BASE_DIR, 'companions');
    let totalImages = 0;
    let totalSizeBytes = 0;
    let companionCount = 0;

    try {
      const companions = await fs.readdir(companionsDir);
      companionCount = companions.length;

      for (const companionId of companions) {
        const companionDir = path.join(companionsDir, companionId);
        const subdirs = ['headers', 'generated'];

        for (const subdir of subdirs) {
          const dirPath = path.join(companionDir, subdir);

          try {
            const files = await fs.readdir(dirPath);

            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const stats = await fs.stat(filePath);

              if (stats.isFile()) {
                totalImages++;
                totalSizeBytes += stats.size;
              }
            }
          } catch {
            // Subdirectory doesn't exist, skip
          }
        }
      }
    } catch {
      // Companions directory doesn't exist yet
    }

    return {
      totalImages,
      totalSizeBytes,
      companionCount,
    };

  } catch (error) {
    storageLogger.error({ error }, 'Failed to get storage stats');
    return {
      totalImages: 0,
      totalSizeBytes: 0,
      companionCount: 0,
    };
  }
}

/**
 * Cleans up orphaned images (images not referenced in database)
 * This should be run periodically as a maintenance task
 */
export async function cleanupOrphanedImages(): Promise<number> {
  // Implementation would require database access to check which images are referenced
  // For now, this is a placeholder for future implementation
  storageLogger.info('Cleanup task not yet implemented');
  return 0;
}

// Initialize directories on module load
ensureDirectories().catch((error) => {
  storageLogger.error({ error }, 'Failed to initialize storage directories');
});
