import { workflowLogger, startTimer } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/storage';
import { filterOutfitForLayering } from './helpers/outfit-filter';
import { buildImagePrompt } from './helpers/prompt-builder';
import { CONTENT_PATTERNS } from '@/config/patterns';

/**
 * Generates an image of the companion using Stable Diffusion
 *
 * This function:
 * 1. Fetches companion data including art style for checkpoint selection
 * 2. Applies smart outfit layering (filters underwear when outerwear present)
 * 3. Detects virtual context (POV, selfie, etc.) to override user presence
 * 4. Builds style-specific prompts using checkpoint configuration
 * 5. Calls SD API with checkpoint-specific parameters
 * 6. Uploads generated image to file storage
 *
 * @param companionId - ID of the companion
 * @param visualState - Current outfit/clothing state
 * @param location - Current location
 * @param visualTags - Dynamic visual tags (pose, camera angle, etc.)
 * @param expression - Facial expression
 * @param isUserPresent - Whether user is physically present (may be overridden by virtual context)
 * @param lighting - Lighting tags for the scene
 * @returns URL of the generated and uploaded image
 */
export async function generateCompanionImage(
  companionId: string,
  visualState: string,
  location: string,
  visualTags: string,
  expression: string,
  isUserPresent: boolean,
  lighting: string,
): Promise<string> {
  const log = workflowLogger.child({
    activity: 'generateCompanionImage',
    companionId,
  });

  const timer = startTimer();

  // Fetch companion data including style for checkpoint selection
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: {
      style: true,                // NEW: For checkpoint selection
      defaultOutfit: true,
      visualDescription: true,
      userAppearance: true
    }
  });

  if (!companion) {
    log.error('Companion not found');
    throw new Error("Companion not found");
  }

  // Smart outfit layering: filter underwear when outerwear is present
  const { filteredOutfit, isNude } = filterOutfitForLayering(
    visualState,
    visualTags,
    location
  );

  // Use filtered outfit or fallback to default
  const safeOutfit = isNude ? filteredOutfit : (filteredOutfit || companion.defaultOutfit || "casual clothes");

  // Safety net for user presence: override if virtual context detected
  // (POV, selfie, camera implies remote interaction, not physical presence)
  const isVirtualContext = CONTENT_PATTERNS.VIRTUAL_CONTEXT.test(visualTags + location);
  const actualUserPresence = isUserPresent && !isVirtualContext;

  // Build prompts with automatic checkpoint selection based on style
  const { positive, negative, config } = buildImagePrompt({
    style: companion.style,
    visualDescription: companion.visualDescription,
    outfit: safeOutfit,
    location,
    visualTags,
    expression,
    lighting,
    isUserPresent: actualUserPresence,
    isNude,
    userAppearance: actualUserPresence ? companion.userAppearance || undefined : undefined
  });

  log.debug({
    promptLength: positive.length,
    style: companion.style,
    checkpoint: config.name,
    hasLora: !!config.lora
  }, 'Starting image generation');

  try {
    // Call SD API with checkpoint-specific parameters
    const response = await fetch(`${env.SD_API_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: positive,
        negative_prompt: negative,
        steps: config.steps,             // Checkpoint-specific steps
        cfg_scale: config.cfg_scale,     // Checkpoint-specific CFG scale
        width: 832,
        height: 1216,
        sampler_name: "DPM++ 2M",
        scheduler: "karras",
        seed: -1,
        // NOTE: If your SD Forge API supports checkpoint switching, uncomment:
        // override_settings: {
        //   sd_model_checkpoint: config.name
        // },
        // override_settings_restore_afterwards: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'Image generation API error');
      throw new Error(`Stable Diffusion API error: ${errorText}`);
    }

    const data = await response.json();
    const base64Image = `data:image/jpeg;base64,${data.images[0]}`;

    // Upload to file storage instead of returning base64
    const uploadResult = await uploadImage(
      base64Image,
      companionId,
      'companion-generated'
    );

    log.info({
      duration: timer(),
      style: companion.style,
      checkpoint: config.name,
      originalSizeKB: Math.round(uploadResult.originalSizeBytes / 1024),
      optimizedSizeKB: Math.round(uploadResult.sizeBytes / 1024),
      compressionPercent: (uploadResult.compressionRatio * 100).toFixed(1),
      url: uploadResult.url,
    }, 'Image generation completed and uploaded');

    return uploadResult.url;

  } catch (error) {
    log.error({ error, duration: timer() }, 'Image generation failed');
    throw error;
  }
}
