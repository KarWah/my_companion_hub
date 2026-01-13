// Parsing utilities for hair styles and clothing

import {
  HAIR_PRIMARY_STYLES,
  CLOTHING_PRESETS,
  CLOTHING_COLORS
} from '../constants';

export interface ParsedHairStyle {
  primary: string;
  customPrimary: string;
  modifiers: string[];
  texture: string;
}

export interface ParsedClothing {
  [key: string]: string; // category names and their color variants
}

/**
 * Parses a hair style string into its components
 * Example: "long wavy parted" → { primary: 'long', modifiers: ['parted'], texture: 'wavy' }
 */
export function parseHairStyle(style: string): ParsedHairStyle {
  const textures = ['straight', 'wavy', 'curly'];
  const modifierIds = ['parted', 'bangs'];
  const primaryIds = HAIR_PRIMARY_STYLES.map(h => h.id);
  const words = style.toLowerCase().split(' ');

  const texture = words.find(w => textures.includes(w)) || '';
  const modifiers = words.filter(w => modifierIds.includes(w));
  const primary = words.find(w => primaryIds.includes(w)) || 'loose';
  const customPrimary = !primaryIds.includes(primary) && !modifierIds.includes(primary) && !textures.includes(primary) ? primary : '';

  return {
    primary: customPrimary ? 'custom' : primary,
    customPrimary,
    modifiers,
    texture
  };
}

/**
 * Parses a clothing outfit string into categorized items with colors
 * Example: "black hoodie, white t-shirt" → { outerwear: 'Hoodie', outerwearColor: 'black', top: 'T-Shirt', topColor: 'white', ... }
 */
export function parseClothingByCategory(outfit: string): ParsedClothing {
  const defaultState: any = {
    outerwear: 'None',
    top: 'None',
    bottom: 'None',
    fullCoverage: 'None',
    underwearTop: 'None',
    underwearBottom: 'None',
    legwear: 'None',
    footwear: 'None'
  };

  // Initialize per-category colors
  Object.keys(defaultState).forEach(cat => {
    defaultState[`${cat}Color`] = '';
  });

  if (!outfit || outfit === 'None') return defaultState;

  // Parse existing outfit string and match to categories
  const items = outfit.toLowerCase().split(',').map(s => s.trim());
  const result: any = { ...defaultState };

  // Match items to categories
  items.forEach(item => {
    // Extract color from this specific item
    let itemColor = '';
    let cleanItem = item;

    const colorMatch = CLOTHING_COLORS.find(c => item.includes(c.id));
    if (colorMatch) {
      itemColor = colorMatch.id;
      cleanItem = item.replace(new RegExp(`^${colorMatch.id}\\s+`), '').trim();
    }

    // Match to category
    for (const [category, options] of Object.entries(CLOTHING_PRESETS)) {
      const match = options.find(opt =>
        opt.toLowerCase() === cleanItem ||
        cleanItem.includes(opt.toLowerCase())
      );
      if (match && match !== 'None') {
        result[category] = match;
        if (itemColor) result[`${category}Color`] = itemColor;
        break;
      }
    }
  });

  return result;
}
