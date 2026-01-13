/**
 * Image Optimization Script
 *
 * Optimizes all images in public/assets to reduce file size
 * Converts to WebP format and resizes appropriately
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '../public/assets');

// Configuration for different asset types
const CONFIG = {
  'hair_style': { width: 400, quality: 80 },
  'hair_color': { width: 400, quality: 80 },
  'body_type': { width: 400, quality: 85 },
  'ethnicity': { width: 400, quality: 85 },
  'styles': { width: 800, quality: 85 },
};

async function getAllImages(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const images = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      images.push(...await getAllImages(fullPath));
    } else if (/\.(png|jpg|jpeg)$/i.test(file.name)) {
      images.push(fullPath);
    }
  }

  return images;
}

async function optimizeImage(imagePath) {
  const relativePath = path.relative(ASSETS_DIR, imagePath);
  const category = relativePath.split(path.sep)[0];
  const config = CONFIG[category] || { width: 600, quality: 80 };

  const outputPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  try {
    const stats = await fs.stat(imagePath);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);

    await sharp(imagePath)
      .resize(config.width, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: config.quality })
      .toFile(outputPath);

    const newStats = await fs.stat(outputPath);
    const newSize = (newStats.size / 1024 / 1024).toFixed(2);
    const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);

    console.log(`✓ ${relativePath}`);
    console.log(`  ${originalSize}MB → ${newSize}MB (${savings}% smaller)`);

    // Delete original if WebP is successful
    if (newStats.size < stats.size) {
      await fs.unlink(imagePath);
      console.log(`  Deleted original PNG/JPG`);
    }

    return { original: stats.size, optimized: newStats.size };
  } catch (error) {
    console.error(`✗ Failed to optimize ${relativePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Image Optimization Starting...\n');

  const images = await getAllImages(ASSETS_DIR);
  console.log(`Found ${images.length} images to optimize\n`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  let optimized = 0;

  for (const imagePath of images) {
    const result = await optimizeImage(imagePath);
    if (result) {
      totalOriginal += result.original;
      totalOptimized += result.optimized;
      optimized++;
    }
    console.log('');
  }

  const totalSavings = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);
  console.log(`\n✅ Optimization Complete!`);
  console.log(`📊 Optimized ${optimized}/${images.length} images`);
  console.log(`💾 Total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🎉 Saved ${totalSavings}% (${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(2)}MB)`);
}

main().catch(console.error);
