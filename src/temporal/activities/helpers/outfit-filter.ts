import { OUTFIT_KEYWORDS, CONTENT_PATTERNS } from '@/config/patterns';
import { workflowLogger } from '@/lib/logger';

/**
 * Smart outfit layering filter for image generation
 *
 * Problem: Stable Diffusion gets confused when receiving layered clothing like
 * "hoodie, shorts, bra, thong" all at once, often rendering underwear visible
 * through outer clothes incorrectly.
 *
 * Solution: If outerwear is present, filter out underwear tags so only visible
 * clothes are included in the prompt. This prevents SD from rendering underwear
 * when it should be hidden under outer layers.
 *
 * @param outfit - Current outfit string (comma-separated clothing items)
 * @param visualTags - Visual tags from context analysis
 * @param location - Current location
 * @returns Object with filtered outfit and nude detection flag
 */
export function filterOutfitForLayering(
  outfit: string,
  visualTags: string,
  location: string
): { filteredOutfit: string; isNude: boolean } {
  // Detect if this is an explicit/nude context
  const isNude = CONTENT_PATTERNS.EXPLICIT_KEYWORDS.test(
    outfit + ' ' + visualTags + ' ' + location
  );

  // If nude context, don't include any outfit (return empty string)
  if (isNude) {
    return { filteredOutfit: '', isNude: true };
  }

  // If no outfit specified or empty, return as-is
  if (!outfit || outfit.trim() === '') {
    return { filteredOutfit: outfit, isNude: false };
  }

  // Smart layering: Check if outerwear is present
  const outfitTags = outfit.split(',').map(t => t.trim().toLowerCase());

  // Check if any tag contains an outerwear keyword
  const hasOuterwear = outfitTags.some(tag =>
    OUTFIT_KEYWORDS.OUTERWEAR.some(keyword => tag.includes(keyword))
  );

  // If outerwear exists, filter out underwear tags
  if (hasOuterwear) {
    workflowLogger.debug(
      { outfitTags },
      "Outerwear detected. Filtering out underwear tags for cleaner image generation"
    );

    // Keep only tags that DON'T contain underwear keywords
    const filteredTags = outfitTags.filter(tag =>
      !OUTFIT_KEYWORDS.UNDERWEAR.some(keyword => tag.includes(keyword))
    );

    // Rejoin the remaining tags
    return { filteredOutfit: filteredTags.join(', '), isNude: false };
  }

  // No outerwear present, keep outfit as-is (underwear-only outfits are allowed)
  return { filteredOutfit: outfit, isNude: false };
}
