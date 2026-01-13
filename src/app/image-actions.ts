"use server";

import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { checkImageGenerationRateLimit } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { getCheckpointForStyle } from "@/config/checkpoints";
import type { ActionResult, SDGenerationParams, ArtStyle } from "@/types/index";

export async function generateImage(
  params: SDGenerationParams & { style?: ArtStyle }
): Promise<ActionResult<{ imageUrl: string }>> {
  try {
    // Verify user is authenticated
    const user = await getAuthenticatedUser();

    // Rate limiting check
    const rateLimit = await checkImageGenerationRateLimit(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Image generation rate limit exceeded" };
    }

    // Get checkpoint configuration based on selected style (default to anime)
    const style = params.style || 'anime';
    const checkpoint = getCheckpointForStyle(style);

    // Build LoRA tag if checkpoint has LoRA configuration
    const loraTag = checkpoint.lora
      ? `<lora:${checkpoint.lora.name}:${checkpoint.lora.weight}>`
      : '';

    // Enhance prompt with checkpoint-specific quality tags and LoRA
    const enhancedPrompt = loraTag
      ? `${checkpoint.qualityTags}, ${loraTag}, ${params.prompt}`
      : `${checkpoint.qualityTags}, ${params.prompt}`;

    // Enhance negative prompt with checkpoint-specific tags
    const enhancedNegativePrompt = `${checkpoint.negativePrompt}, ${params.negative_prompt}`;

    // Use checkpoint-specific parameters with user overrides
    const finalSteps = params.steps || checkpoint.steps;
    const finalCfgScale = params.cfg_scale || checkpoint.cfg_scale;

    logger.info({
      userId: user.id,
      style,
      checkpoint: checkpoint.name,
      hasLora: !!checkpoint.lora
    }, 'Generating image with checkpoint configuration');

    const response = await fetch(`${process.env.SD_API_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        negative_prompt: enhancedNegativePrompt,
        steps: finalSteps,
        width: params.width,
        height: params.height,
        sampler_name: params.sampler_name,
        cfg_scale: finalCfgScale,
        seed: params.seed,
        // NOTE: If your SD Forge API supports checkpoint switching, uncomment:
        // override_settings: {
        //   sd_model_checkpoint: checkpoint.name
        // }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error, status: response.status }, "SD API Error");
      return { success: false, error: `Image generation failed: ${error}` };
    }

    const data = await response.json();
    const imageUrl = `data:image/png;base64,${data.images[0]}`;

    return {
      success: true,
      data: { imageUrl }
    };
  } catch (error) {
    logger.error({ error }, "Image generation error");
    return {
      success: false,
      error: "Failed to generate image. Please check your SD Forge connection."
    };
  }
}
