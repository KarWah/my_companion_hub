/**
 * Centralized Regex Patterns and Keywords for Content Analysis
 *
 * This file contains all regex patterns and keyword lists used throughout
 * the application for consistent content detection and parsing.
 */

/**
 * Content detection patterns
 */
export const CONTENT_PATTERNS = {
  /**
   * Detects explicit/nude content in outfit, visual tags, or location
   * Used to determine if companion should be rendered without clothes
   */
  EXPLICIT_KEYWORDS: /naked|nude|unclothed|topless|bottomless|pussy|hole|anus|anal|spreading|spread|asscheeks|cheek|exposed|undressing|stripping|no clothes/i,

  /**
   * Detects virtual/remote contexts (POV, selfie, camera, etc.)
   * Used to prevent rendering couples when the interaction is virtual/remote
   * (e.g., user is viewing through camera, not physically present)
   */
  VIRTUAL_CONTEXT: /pov|viewer|eyes|from above|selfie|recording|filming|phone|camera|mirror/i,

  /**
   * Matches color prefixes in clothing descriptions
   * Example: "red dress" -> captures "red"
   */
  COLOR_PREFIX: /^(black|white|red|blue|green|yellow|purple|pink|gray|brown|orange|navy|beige|tan)\s+/i,
};

/**
 * Clothing keyword categories for smart outfit layering
 *
 * Used to filter underwear tags when outerwear is present,
 * preventing SD from getting confused by layered clothing
 */
export const OUTFIT_KEYWORDS = {
  /**
   * Underwear items that should be hidden when outerwear is present
   */
  UNDERWEAR: [
    'thong',
    'panties',
    'bra',
    'sports bra',
    'underwear',
    'lingerie',
    'boxers',
    'briefs'
  ],

  /**
   * Outerwear items that indicate underwear should be filtered out
   * (unless in explicit/nude context)
   */
  OUTERWEAR: [
    'hoodie',
    'sweatshirt',
    'jacket',
    'coat',
    'shirt',
    't-shirt',
    'top',
    'shorts',
    'pants',
    'jeans',
    'skirt',
    'dress',
    'leggings',
    'sweater'
  ]
};
