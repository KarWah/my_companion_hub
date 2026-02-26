/**
 * Outfit Filter Helper Tests
 *
 * Tests for smart outfit layering that prevents SD from rendering
 * underwear visible through outer clothes.
 */

import { describe, it, expect } from 'vitest';
import { filterOutfitForLayering } from './outfit-filter';

describe('filterOutfitForLayering', () => {
  it('should remove outfit for nude contexts', async () => {
    // Only outfit (first param) is checked for nudity — visualTags and location are intentionally excluded
    // to avoid false positives from pose words (e.g. "exposed midriff" in visual_tags).
    const nudeKeywords = [
      'naked',
      'nude',
      'unclothed',
      'no clothes',
    ];

    for (const keyword of nudeKeywords) {
      const result = filterOutfitForLayering(keyword, '', 'bedroom');
      expect(result.filteredOutfit).toBe('');
      expect(result.isNude).toBe(true);
    }
  });

  it('should detect nude context in outfit string', async () => {
    const result = filterOutfitForLayering('naked', '', 'room');
    expect(result.filteredOutfit).toBe('');
    expect(result.isNude).toBe(true);
  });

  it('should not flag nude when nude keyword only appears in location', async () => {
    // Location is intentionally not checked — nude words in location are not outfit indicators
    const result = filterOutfitForLayering('dress', '', 'nude beach');
    expect(result.filteredOutfit).toBe('dress');
    expect(result.isNude).toBe(false);
  });

  it('should filter underwear when outerwear present', async () => {
    const result = filterOutfitForLayering(
      'black hoodie, red bra, blue jeans',
      '',
      'park'
    );

    expect(result.filteredOutfit).toContain('black hoodie');
    expect(result.filteredOutfit).toContain('blue jeans');
    expect(result.filteredOutfit).not.toContain('bra');
    expect(result.isNude).toBe(false);
  });

  it('should filter all underwear keywords when outerwear present', async () => {
    const underwearKeywords = ['thong', 'panties', 'bra', 'sports bra', 'underwear', 'lingerie'];

    for (const keyword of underwearKeywords) {
      const result = filterOutfitForLayering(
        `hoodie, ${keyword}`,
        '',
        'room'
      );

      expect(result.filteredOutfit).toContain('hoodie');
      expect(result.filteredOutfit).not.toContain(keyword);
      expect(result.isNude).toBe(false);
    }
  });

  it('should keep underwear when no outerwear present', async () => {
    const result = filterOutfitForLayering('white bra, black panties', '', 'bedroom');

    expect(result.filteredOutfit).toBe('white bra, black panties');
    expect(result.isNude).toBe(false);
  });

  it('should recognize all outerwear keywords', async () => {
    const outerwearKeywords = [
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
    ];

    for (const keyword of outerwearKeywords) {
      const result = filterOutfitForLayering(
        `${keyword}, bra`,
        '',
        'room'
      );

      expect(result.filteredOutfit).toContain(keyword);
      expect(result.filteredOutfit).not.toContain('bra');
    }
  });

  it('should handle empty outfit string', async () => {
    const result = filterOutfitForLayering('', '', 'room');

    expect(result.filteredOutfit).toBe('');
    expect(result.isNude).toBe(false);
  });

  it('should handle whitespace-only outfit string', async () => {
    const result = filterOutfitForLayering('   ', '', 'room');

    expect(result.filteredOutfit).toBe('   ');
    expect(result.isNude).toBe(false);
  });

  it('should handle mixed case keywords', async () => {
    const result = filterOutfitForLayering('Black HOODIE, Red BRA, Blue JEANS', '', 'park');

    expect(result.filteredOutfit.toLowerCase()).toContain('hoodie');
    expect(result.filteredOutfit.toLowerCase()).toContain('jeans');
    expect(result.filteredOutfit.toLowerCase()).not.toContain('bra');
  });

  it('should handle outfit with multiple underwear items', async () => {
    const result = filterOutfitForLayering(
      'hoodie, bra, panties, thong, lingerie',
      '',
      'room'
    );

    expect(result.filteredOutfit).toBe('hoodie');
    expect(result.isNude).toBe(false);
  });

  it('should handle outfit with multiple outerwear items', async () => {
    const result = filterOutfitForLayering(
      'jacket, hoodie, jeans, bra',
      '',
      'outside'
    );

    expect(result.filteredOutfit).toContain('jacket');
    expect(result.filteredOutfit).toContain('hoodie');
    expect(result.filteredOutfit).toContain('jeans');
    expect(result.filteredOutfit).not.toContain('bra');
  });

  it('should trim whitespace in tags', async () => {
    const result = filterOutfitForLayering(
      '  hoodie  ,  bra  ,  jeans  ',
      '',
      'room'
    );

    expect(result.filteredOutfit).toContain('hoodie');
    expect(result.filteredOutfit).toContain('jeans');
    expect(result.filteredOutfit).not.toContain('bra');
  });

  it('should handle partial keyword matches', async () => {
    // "sports bra" contains "bra" but should be filtered as a whole
    const result = filterOutfitForLayering(
      'hoodie, sports bra, athletic top',
      '',
      'gym'
    );

    expect(result.filteredOutfit).toContain('hoodie');
    expect(result.filteredOutfit).toContain('athletic top');
    expect(result.filteredOutfit).not.toContain('sports bra');
  });

  it('should handle color prefixes in clothing items', async () => {
    const result = filterOutfitForLayering(
      'red hoodie, black bra, blue jeans',
      '',
      'park'
    );

    expect(result.filteredOutfit).toContain('red hoodie');
    expect(result.filteredOutfit).toContain('blue jeans');
    expect(result.filteredOutfit).not.toContain('black bra');
  });

  it('should not filter when only underwear-like words appear in non-underwear context', async () => {
    // "support top" contains "top" which is outerwear, not underwear
    const result = filterOutfitForLayering('support top', '', 'gym');

    expect(result.filteredOutfit).toBe('support top');
    expect(result.isNude).toBe(false);
  });

  it('should handle complex outfit strings', async () => {
    const result = filterOutfitForLayering(
      'white t-shirt, blue jeans, black belt, red underwear, brown shoes',
      '',
      'street'
    );

    expect(result.filteredOutfit).toContain('white t-shirt');
    expect(result.filteredOutfit).toContain('blue jeans');
    expect(result.filteredOutfit).toContain('black belt');
    expect(result.filteredOutfit).toContain('brown shoes');
    expect(result.filteredOutfit).not.toContain('underwear');
  });

  it('should handle case-insensitive nude detection', async () => {
    // Only outfit (first param) is checked — pass keywords in the outfit field
    const testCases = ['NAKED', 'Nude', 'UnClothed'];

    for (const keyword of testCases) {
      const result = filterOutfitForLayering(keyword, '', 'room');
      expect(result.isNude).toBe(true);
      expect(result.filteredOutfit).toBe('');
    }
  });

  it('should detect nude context when outfit field contains nude keyword', async () => {
    // Nude detection only checks outfit (first param); visualTags with pose words don't affect it
    const result = filterOutfitForLayering(
      'naked',
      'lying on bed',
      'bedroom'
    );

    expect(result.isNude).toBe(true);
    expect(result.filteredOutfit).toBe('');
  });

  it('should return outfit as-is when only outerwear', async () => {
    const result = filterOutfitForLayering('hoodie, jeans, jacket', '', 'outside');

    expect(result.filteredOutfit).toBe('hoodie, jeans, jacket');
    expect(result.isNude).toBe(false);
  });

  it('should handle single clothing item', async () => {
    const result = filterOutfitForLayering('dress', '', 'park');

    expect(result.filteredOutfit).toBe('dress');
    expect(result.isNude).toBe(false);
  });

  it('should handle underwear-only outfit', async () => {
    const result = filterOutfitForLayering('bra, panties', '', 'bedroom');

    expect(result.filteredOutfit).toBe('bra, panties');
    expect(result.isNude).toBe(false);
  });

  it('should prioritize nude detection over outfit filtering', async () => {
    // Even with outerwear, if nude keyword appears in the outfit field, return empty
    const result = filterOutfitForLayering(
      'hoodie, jeans, naked',
      '',
      'room'
    );

    expect(result.isNude).toBe(true);
    expect(result.filteredOutfit).toBe('');
  });
});
