import { describe, it, expect } from 'vitest';
import { parseHairStyle, parseClothingByCategory } from './parsers';

describe('parseHairStyle', () => {
  it('should handle hair style with only primary', () => {
    const result = parseHairStyle('ponytail');
    expect(result.primary).toBe('ponytail');
    expect(result.modifiers).toEqual([]);
    expect(result.texture).toBe('');
    expect(result.customPrimary).toBe('');
  });

  it('should handle hair style with texture', () => {
    const result = parseHairStyle('loose curly');
    expect(result.primary).toBe('loose');
    expect(result.texture).toBe('curly');
    expect(result.modifiers).toEqual([]);
  });

  it('should handle hair style with modifier', () => {
    const result = parseHairStyle('short parted');
    expect(result.primary).toBe('short');
    expect(result.modifiers).toContain('parted');
    expect(result.texture).toBe('');
  });

  it('should handle hair style with all components', () => {
    const result = parseHairStyle('ponytail parted straight');
    expect(result.primary).toBe('ponytail');
    expect(result.modifiers).toContain('parted');
    expect(result.texture).toBe('straight');
  });

  it('should default to loose when no primary found', () => {
    const result = parseHairStyle('wavy parted');
    expect(result.primary).toBe('loose');
    expect(result.texture).toBe('wavy');
    expect(result.modifiers).toContain('parted');
  });

  it('should handle empty string', () => {
    const result = parseHairStyle('');
    expect(result.primary).toBe('loose');
    expect(result.modifiers).toEqual([]);
    expect(result.texture).toBe('');
  });

  it('should handle multiple modifiers', () => {
    const result = parseHairStyle('short parted bangs straight');
    expect(result.primary).toBe('short');
    expect(result.modifiers).toContain('parted');
    expect(result.modifiers).toContain('bangs');
    expect(result.texture).toBe('straight');
  });
});

describe('parseClothingByCategory', () => {
  it('should initialize with default None values', () => {
    const result = parseClothingByCategory('');
    expect(result.outerwear).toBe('None');
    expect(result.top).toBe('None');
    expect(result.bottom).toBe('None');
    expect(result.fullCoverage).toBe('None');
    expect(result.underwearTop).toBe('None');
    expect(result.underwearBottom).toBe('None');
    expect(result.legwear).toBe('None');
    expect(result.footwear).toBe('None');
  });

  it('should parse simple clothing string with proper casing', () => {
    const result = parseClothingByCategory('black hoodie');
    expect(result.outerwear).toBe('Hoodie'); // Matches original casing from presets
    expect(result.outerwearColor).toBe('black');
    expect(result.top).toBe('None'); // Other categories remain None
  });

  it('should parse multiple clothing items', () => {
    const result = parseClothingByCategory('red t-shirt, blue jeans');
    expect(result.top).toBe('T-Shirt');
    expect(result.topColor).toBe('red');
    expect(result.bottom).toBe('Jeans');
    expect(result.bottomColor).toBe('blue');
    expect(result.outerwear).toBe('None');
  });

  it('should handle clothing without colors', () => {
    const result = parseClothingByCategory('hoodie, jeans');
    expect(result.outerwear).toBe('Hoodie');
    expect(result.outerwearColor).toBe('');
    expect(result.bottom).toBe('Jeans');
    expect(result.bottomColor).toBe('');
  });

  it('should handle None value', () => {
    const result = parseClothingByCategory('None');
    expect(result.outerwear).toBe('None');
    expect(result.top).toBe('None');
  });

  it('should handle complex outfit with multiple layers', () => {
    const result = parseClothingByCategory('black jacket, white t-shirt, blue jeans, red sneakers');
    expect(result.outerwear).toBe('Jacket');
    expect(result.outerwearColor).toBe('black');
    expect(result.top).toBe('T-Shirt');
    expect(result.topColor).toBe('white');
    expect(result.bottom).toBe('Jeans');
    expect(result.bottomColor).toBe('blue');
    expect(result.footwear).toBe('Sneakers');
    expect(result.footwearColor).toBe('red');
  });

  it('should match color prefixes correctly', () => {
    const result = parseClothingByCategory('red dress');
    expect(result.fullCoverage).toBe('Dress');
    expect(result.fullCoverageColor).toBe('red');
  });

  it('should handle items without colors with default empty string', () => {
    const result = parseClothingByCategory('dress');
    expect(result.fullCoverage).toBe('Dress');
    expect(result.fullCoverageColor).toBe('');
  });
});
