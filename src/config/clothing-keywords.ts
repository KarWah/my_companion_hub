/**
 * Clothing Keywords Configuration
 *
 * These are used as HINTS for the image generation system, not strict constraints.
 * The LLM should be free to understand any clothing in context.
 */

// Keywords that indicate explicit/nude content
export const EXPLICIT_CONTENT_KEYWORDS = [
  'naked', 'nude', 'unclothed', 'topless', 'bottomless',
  'pussy', 'hole', 'anus', 'anal', 'spreading', 'spread',
  'asscheeks', 'cheek', 'exposed', 'undressing', 'stripping',
  'no clothes'
] as const;

// Keywords that suggest virtual/camera context (not physical presence)
// NOTE: Be specific to avoid false positives in couple scenes
export const VIRTUAL_CONTEXT_KEYWORDS = [
  'selfie mode', 'selfie camera', 'phone camera', 'mirror selfie',
  'recording herself', 'filming herself', 'facetime', 'video call',
  'webcam', 'camera phone'
] as const;

/**
 * Clothing Categories for Smart Layering
 *
 * These are GUIDELINES for the image generator to understand what should be visible.
 * The LLM can describe any clothing - these just help SD understand layering.
 */
export const CLOTHING_CATEGORIES = {
  // Upper body outerwear that typically hides bras/upper underwear
  upperOuterwear: [
    'hoodie', 'jacket', 'sweater', 'sweatshirt', 'coat',
    'blazer', 'cardigan', 't-shirt', 'shirt', 'blouse',
    'pullover', 'vest', 'windbreaker'
  ],

  // Lower body wear that hides underwear
  lowerOuterwear: [
    'pants', 'jeans', 'skirt', 'shorts', 'leggings',
    'trousers', 'slacks', 'sweatpants', 'joggers'
  ],

  // Upper body underwear
  upperUnderwear: [
    'bra', 'sports bra', 'bikini top'
  ],

  // Lower body underwear
  lowerUnderwear: [
    'thong', 'panties', 'underwear', 'boxers', 'briefs',
    'bikini bottom', 'g-string'
  ],

  // Tops that might show underwear (straps, etc)
  exposedTops: [
    'tank top', 'crop top', 'camisole', 'tube top',
    'halter top', 'spaghetti strap'
  ],

  // Full coverage items that hide everything underneath
  fullCoverage: [
    'dress', 'jumpsuit', 'romper', 'bodysuit', 'onesie', 'robe'
  ]
} as const;

/**
 * Determines what underwear should be hidden based on outer layers
 * This is a GUIDELINE for SD, not a constraint on the LLM's understanding
 */
export function shouldHideUnderwear(
  outfitTags: string[],
  isNude: boolean
): { hideUpperUnderwear: boolean; hideLowerUnderwear: boolean } {
  // If nude context, show everything that's mentioned
  if (isNude) {
    return { hideUpperUnderwear: false, hideLowerUnderwear: false };
  }

  // Check for upper body coverage
  const hasUpperOuterwear = outfitTags.some(tag =>
    CLOTHING_CATEGORIES.upperOuterwear.some(item => tag.includes(item))
  );

  // Check for lower body coverage
  const hasLowerOuterwear = outfitTags.some(tag =>
    CLOTHING_CATEGORIES.lowerOuterwear.some(item => tag.includes(item))
  );

  // Check for full coverage items
  const hasFullCoverage = outfitTags.some(tag =>
    CLOTHING_CATEGORIES.fullCoverage.some(item => tag.includes(item))
  );

  // Check for exposed tops where underwear might be visible
  const hasExposedTop = outfitTags.some(tag =>
    CLOTHING_CATEGORIES.exposedTops.some(item => tag.includes(item))
  );

  return {
    // Hide upper underwear if wearing full coverage or upper outerwear (unless it's an exposed top)
    hideUpperUnderwear: hasFullCoverage || (hasUpperOuterwear && !hasExposedTop),

    // Hide lower underwear if wearing full coverage or lower outerwear
    hideLowerUnderwear: hasFullCoverage || hasLowerOuterwear
  };
}

/**
 * Filters outfit tags for SD prompt generation based on layering logic
 * Removes underwear that would be hidden by outer layers
 */
export function filterOutfitForImageGeneration(
  outfitString: string,
  isNude: boolean
): string {
  if (!outfitString) return "";

  const outfitTags = outfitString.split(',').map(t => t.trim().toLowerCase());
  const { hideUpperUnderwear, hideLowerUnderwear } = shouldHideUnderwear(outfitTags, isNude);

  // Filter out hidden underwear
  const filteredTags = outfitTags.filter(tag => {
    const isUpperUnderwear = CLOTHING_CATEGORIES.upperUnderwear.some(item => tag.includes(item));
    const isLowerUnderwear = CLOTHING_CATEGORIES.lowerUnderwear.some(item => tag.includes(item));

    if (hideUpperUnderwear && isUpperUnderwear) return false;
    if (hideLowerUnderwear && isLowerUnderwear) return false;

    return true;
  });

  return filteredTags.join(', ');
}
