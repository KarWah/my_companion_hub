import { getCheckpointForStyle, type CheckpointConfig } from '@/config/checkpoints';
import { IMAGE_GENERATION_CONFIG } from '@/config/prompts/image-generation';
import type { ArtStyle } from '@prisma/client';

/**
 * Parameters for building image generation prompts
 */
export interface BuildImagePromptParams {
  style: ArtStyle;                // Art style (anime or realistic)
  visualDescription: string;      // Base physical description of companion
  outfit: string;                 // Current outfit (already filtered for layering)
  location: string;               // Current location
  visualTags: string;             // Dynamic visual tags from context
  expression: string;             // Facial expression
  lighting: string;               // Lighting tags
  isUserPresent: boolean;         // Whether user is physically present
  isNude: boolean;                // Whether scene is explicit/nude
  userAppearance?: string;        // Physical description of user (if present)
}

/**
 * Result of prompt building
 */
export interface BuildImagePromptResult {
  positive: string;               // Full positive prompt
  negative: string;               // Full negative prompt
  config: CheckpointConfig;       // Checkpoint configuration used
}

/**
 * Builds comprehensive image generation prompts with automatic checkpoint selection
 *
 * This function:
 * 1. Selects the appropriate checkpoint configuration based on art style
 * 2. Constructs character tags (solo vs couple) based on user presence
 * 3. Builds positive prompt with quality tags, LoRA, and scene description
 * 4. Builds negative prompt with style-specific exclusions
 * 5. Returns both prompts and the checkpoint config for API parameters
 *
 * @param params - Prompt building parameters
 * @returns Positive prompt, negative prompt, and checkpoint configuration
 */
export function buildImagePrompt(params: BuildImagePromptParams): BuildImagePromptResult {
  // Get checkpoint configuration for the specified art style
  const checkpoint = getCheckpointForStyle(params.style);

  // Build character tags based on user presence
  let characterTags: string;
  let userAppearanceTags = '';

  if (params.isUserPresent) {
    characterTags = '(1girl, 1boy, hetero), couple focus';

    // Include user appearance if present
    if (params.userAppearance) {
      userAppearanceTags = `(1boy, ${params.userAppearance}),`;
    }
  } else {
    characterTags = '(1girl, solo)';
  }

  // Build LoRA tag if checkpoint has LoRA configuration
  const loraTag = checkpoint.lora
    ? `<lora:${checkpoint.lora.name}:${checkpoint.lora.weight}> inuk, uncensored,`
    : '';

  // Construct positive prompt
  // Format: quality tags, LoRA, character tags, user appearance, outfit, visual description, visual tags, expression, location, lighting
  const positivePromptParts = [
    checkpoint.qualityTags,
    loraTag,
    characterTags,
    userAppearanceTags,
    params.outfit,
    params.visualDescription,
    `(${params.visualTags})`,
    `(${params.expression})`,
    `(${params.location})`,
    params.lighting
  ].filter(part => part && part.trim() !== '');  // Remove empty parts

  // Join and clean up whitespace
  const positive = positivePromptParts.join(', ').replace(/\s+/g, ' ').trim();

  // Build negative prompt with conditional additions
  const negativePromptParts = [
    checkpoint.negativePrompt,
    IMAGE_GENERATION_CONFIG.BASE_NEGATIVE
  ];

  // Add couple-specific negative tags if user is present
  if (params.isUserPresent) {
    negativePromptParts.push(IMAGE_GENERATION_CONFIG.COUPLE_NEGATIVE_ADDITIONS);
  } else {
    // Add solo-specific negative tags if user is not present
    negativePromptParts.push(IMAGE_GENERATION_CONFIG.SOLO_NEGATIVE_ADDITIONS);
  }

  // Add nude-specific negative tags if scene is explicit
  if (params.isNude) {
    negativePromptParts.push(IMAGE_GENERATION_CONFIG.NUDE_NEGATIVE_ADDITIONS);
  }

  const negative = negativePromptParts.join(', ');

  return {
    positive,
    negative,
    config: checkpoint
  };
}
