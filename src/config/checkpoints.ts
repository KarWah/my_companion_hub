/**
 * Checkpoint Configuration for Stable Diffusion Image Generation
 *
 * This file centralizes all checkpoint/model configuration for easy updates.
 * To change models, simply update the 'name' field for each style.
 */

export type CheckpointConfig = {
  name: string;              // Model name for SD API
  lora?: {
    name: string;
    weight: number;
  };
  qualityTags: string;       // Positive quality prompt additions
  negativePrompt: string;    // Base negative prompt
  cfg_scale: number;         // Recommended CFG scale
  steps: number;             // Recommended steps
};

/**
 * Checkpoint configurations for different art styles
 *
 * TODO: Update model names with your actual CivitAI model names
 */
export const CHECKPOINTS: Record<'anime' | 'realistic', CheckpointConfig> = {
  anime: {
    // TODO: Replace with your anime model name from CivitAI/SD Forge
    name: 'illustrious_or_your_anime_model.safetensors',

    lora: {
      name: '[inukai mofu] Artist Style Illustrious_2376885',
      weight: 0.4
    },

    qualityTags: '(masterpiece, best quality:1.2), absurdres, highres, anime style, key visual, vibrant colors, uncensored',

    negativePrompt: '(bad quality:1.15), (worst quality:1.3), neghands, monochrome, 3d, realistic, photorealistic, long neck',

    cfg_scale: 6,
    steps: 28
  },

  realistic: {
    // TODO: Replace with your realistic model name from CivitAI/SD Forge
    name: 'realisticVision_or_your_realistic_model.safetensors',

    // No LoRA for realistic style (or add a custom one later if desired)
    lora: undefined,

    qualityTags: '(photorealistic:1.3), raw photo, 8k uhd, dslr, soft lighting, high quality, film grain',

    negativePrompt: '(bad quality:1.15), (worst quality:1.3), neghands, anime, cartoon, illustration, drawing, painting',

    cfg_scale: 7,
    steps: 30
  }
};

/**
 * Helper function to get checkpoint configuration by art style
 *
 * @param style - The art style ('anime' or 'realistic')
 * @returns Checkpoint configuration for the specified style
 */
export function getCheckpointForStyle(style: 'anime' | 'realistic'): CheckpointConfig {
  return CHECKPOINTS[style];
}
