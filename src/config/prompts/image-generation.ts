/**
 * Image Generation Configuration
 *
 * This file contains all negative prompts and quality tags for image generation.
 * These base configurations are used unless overridden by checkpoint-specific settings.
 */

/**
 * Image generation configuration constants
 */
export const IMAGE_GENERATION_CONFIG = {
  /**
   * Base negative prompt applied to all generations
   * Prevents common SD artifacts and quality issues
   */
  BASE_NEGATIVE: '(bad quality:1.15), (worst quality:1.3), neghands, monochrome, 3d, long neck, ugly fingers, ugly hands, ugly, easynegative, text, watermark, deformed, mutated, cropped, ugly, disfigured, deformed face, ugly face, non-detailed',

  /**
   * Additional negative prompt for couple/duo scenes (when user is present)
   * Prevents extra limbs and anatomy issues in multi-person images
   */
  COUPLE_NEGATIVE_ADDITIONS: 'extra limbs, extra arms, floating limbs',

  /**
   * Additional negative prompt for solo scenes (when user is not present)
   * Prevents male figures from appearing in solo companion images
   */
  SOLO_NEGATIVE_ADDITIONS: 'multiple views, boyfriend, 1boy, man, male, penis, multiple people, 2boys, beard, male focus, from behind',

  /**
   * Additional negative prompt for nude/explicit scenes
   * Prevents clothing artifacts when companion should be unclothed
   */
  NUDE_NEGATIVE_ADDITIONS: 'clothes, clothing, shirt, pants, bra, panties',
};
