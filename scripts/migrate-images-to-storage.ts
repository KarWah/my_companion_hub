/**
 * Migration Script: Base64 Images to File Storage
 *
 * This script migrates existing base64-encoded images from the database
 * to the file system storage.
 *
 * Usage:
 *   tsx scripts/migrate-images-to-storage.ts
 *
 * What it does:
 * 1. Finds all companions with base64 header images
 * 2. Uploads each image to file storage
 * 3. Updates database with new URL
 * 4. Keeps old base64 data as backup (headerImageLegacy)
 * 5. Migrates message images as well
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { uploadImage } from '../src/lib/storage';

interface MigrationStats {
  companionsProcessed: number;
  companionsSuccess: number;
  companionsFailed: number;
  messagesProcessed: number;
  messagesSuccess: number;
  messagesFailed: number;
  totalSpaceSavedBytes: number;
}

async function migrateCompanionImages(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    companionsProcessed: 0,
    companionsSuccess: 0,
    companionsFailed: 0,
    messagesProcessed: 0,
    messagesSuccess: 0,
    messagesFailed: 0,
    totalSpaceSavedBytes: 0,
  };

  console.log('\n🔄 Starting image migration to file storage...\n');

  // Step 1: Migrate companion header images
  console.log('📸 Migrating companion header images...');

  const companions = await prisma.companion.findMany({
    where: {
      // Find companions with legacy base64 data but no URL yet
      headerImageLegacy: { not: null },
      headerImageUrl: null,
    },
  });

  console.log(`Found ${companions.length} companions with base64 header images\n`);

  for (const companion of companions) {
    stats.companionsProcessed++;

    if (!companion.headerImageLegacy) continue;

    try {
      console.log(`[${stats.companionsProcessed}/${companions.length}] Migrating ${companion.name} (${companion.id})...`);

      // Upload to file storage
      const uploadResult = await uploadImage(
        companion.headerImageLegacy,
        companion.id,
        'companion-header'
      );

      // Update companion with URL
      await prisma.companion.update({
        where: { id: companion.id },
        data: {
          headerImageUrl: uploadResult.url,
          // Keep legacy data as backup for now
        },
      });

      stats.companionsSuccess++;
      stats.totalSpaceSavedBytes += companion.headerImageLegacy.length - uploadResult.url.length;

      console.log(`  ✅ Success: ${uploadResult.url}`);
      console.log(`  💾 Size: ${(uploadResult.originalSizeBytes / 1024).toFixed(1)}KB → ${(uploadResult.sizeBytes / 1024).toFixed(1)}KB (${(uploadResult.compressionRatio * 100).toFixed(1)}% saved)\n`);

    } catch (error) {
      stats.companionsFailed++;
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  // Step 2: Migrate message images (generated images)
  console.log('\n🖼️  Migrating message images...');

  const messages = await prisma.message.findMany({
    where: {
      imageUrl: {
        startsWith: 'data:image', // Only base64 images
      },
    },
    include: {
      companion: {
        select: { id: true, name: true },
      },
    },
  });

  console.log(`Found ${messages.length} messages with base64 images\n`);

  for (const message of messages) {
    stats.messagesProcessed++;

    if (!message.imageUrl || !message.imageUrl.startsWith('data:image')) continue;

    try {
      console.log(`[${stats.messagesProcessed}/${messages.length}] Migrating message image for ${message.companion.name}...`);

      // Upload to file storage
      const uploadResult = await uploadImage(
        message.imageUrl,
        message.companionId,
        'companion-generated'
      );

      // Update message with URL
      await prisma.message.update({
        where: { id: message.id },
        data: {
          imageUrl: uploadResult.url,
        },
      });

      stats.messagesSuccess++;
      stats.totalSpaceSavedBytes += message.imageUrl.length - uploadResult.url.length;

      console.log(`  ✅ Success: ${uploadResult.url}`);
      console.log(`  💾 Size: ${(uploadResult.originalSizeBytes / 1024).toFixed(1)}KB → ${(uploadResult.sizeBytes / 1024).toFixed(1)}KB (${(uploadResult.compressionRatio * 100).toFixed(1)}% saved)\n`);

    } catch (error) {
      stats.messagesFailed++;
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  return stats;
}

async function printMigrationSummary(stats: MigrationStats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log('Companion Header Images:');
  console.log(`  • Processed: ${stats.companionsProcessed}`);
  console.log(`  • Success:   ${stats.companionsSuccess} ✅`);
  console.log(`  • Failed:    ${stats.companionsFailed} ❌\n`);

  console.log('Message Images:');
  console.log(`  • Processed: ${stats.messagesProcessed}`);
  console.log(`  • Success:   ${stats.messagesSuccess} ✅`);
  console.log(`  • Failed:    ${stats.messagesFailed} ❌\n`);

  const totalSuccess = stats.companionsSuccess + stats.messagesSuccess;
  const totalFailed = stats.companionsFailed + stats.messagesFailed;
  const totalProcessed = stats.companionsProcessed + stats.messagesProcessed;

  console.log('Total:');
  console.log(`  • Processed: ${totalProcessed}`);
  console.log(`  • Success:   ${totalSuccess} ✅`);
  console.log(`  • Failed:    ${totalFailed} ❌\n`);

  console.log('Space Savings:');
  const savedMB = stats.totalSpaceSavedBytes / 1024 / 1024;
  console.log(`  • Database size reduced by: ${savedMB.toFixed(2)} MB 💾\n`);

  console.log('='.repeat(60) + '\n');

  if (totalFailed === 0) {
    console.log('✨ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Verify images are displaying correctly in the app');
    console.log('  2. After verification, you can remove headerImageLegacy field:');
    console.log('     - Update schema.prisma (remove headerImageLegacy)');
    console.log('     - Run: npx prisma migrate dev --name remove-legacy-images\n');
  } else {
    console.log('⚠️  Migration completed with some failures.');
    console.log('Please review the errors above and retry if needed.\n');
  }
}

// Run migration
migrateCompanionImages()
  .then(printMigrationSummary)
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
