/**
 * Color helper utilities for dynamic clothing category colors
 * Tailwind requires explicit class names at build time, so we map color names to actual classes
 */

export type CategoryColor = 'cyan' | 'pink' | 'blue' | 'indigo' | 'rose' | 'orange' | 'purple' | 'green';

// Colors from the clothing color picker
export type ClothingColor = 'white' | 'black' | 'gray' | 'red' | 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange' | 'brown';

interface ColorClasses {
  // For selected items
  bg: string;
  border: string;
  text: string;

  // For category headers
  headerBg: string;
  headerText: string;
  headerBorder: string;

  // For section labels
  sectionBg: string;
  sectionText: string;
  sectionBorder: string;
}

export const COLOR_MAP: Record<CategoryColor, ColorClasses> = {
  cyan: {
    bg: 'bg-cyan-500',
    border: 'border-cyan-500',
    text: 'text-white',
    headerBg: 'bg-cyan-500/20',
    headerText: 'text-cyan-400',
    headerBorder: 'border-cyan-500/30',
    sectionBg: 'bg-cyan-500/20',
    sectionText: 'text-cyan-400',
    sectionBorder: 'border-cyan-500/30',
  },
  pink: {
    bg: 'bg-pink-500',
    border: 'border-pink-500',
    text: 'text-white',
    headerBg: 'bg-pink-500/20',
    headerText: 'text-pink-400',
    headerBorder: 'border-pink-500/30',
    sectionBg: 'bg-pink-500/20',
    sectionText: 'text-pink-400',
    sectionBorder: 'border-pink-500/30',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-white',
    headerBg: 'bg-blue-500/20',
    headerText: 'text-blue-400',
    headerBorder: 'border-blue-500/30',
    sectionBg: 'bg-blue-500/20',
    sectionText: 'text-blue-400',
    sectionBorder: 'border-blue-500/30',
  },
  indigo: {
    bg: 'bg-indigo-500',
    border: 'border-indigo-500',
    text: 'text-white',
    headerBg: 'bg-indigo-500/20',
    headerText: 'text-indigo-400',
    headerBorder: 'border-indigo-500/30',
    sectionBg: 'bg-indigo-500/20',
    sectionText: 'text-indigo-400',
    sectionBorder: 'border-indigo-500/30',
  },
  rose: {
    bg: 'bg-rose-500',
    border: 'border-rose-500',
    text: 'text-white',
    headerBg: 'bg-rose-500/20',
    headerText: 'text-rose-400',
    headerBorder: 'border-rose-500/30',
    sectionBg: 'bg-rose-500/20',
    sectionText: 'text-rose-400',
    sectionBorder: 'border-rose-500/30',
  },
  orange: {
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    text: 'text-white',
    headerBg: 'bg-orange-500/20',
    headerText: 'text-orange-400',
    headerBorder: 'border-orange-500/30',
    sectionBg: 'bg-orange-500/20',
    sectionText: 'text-orange-400',
    sectionBorder: 'border-orange-500/30',
  },
  purple: {
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    text: 'text-white',
    headerBg: 'bg-purple-500/20',
    headerText: 'text-purple-400',
    headerBorder: 'border-purple-500/30',
    sectionBg: 'bg-purple-500/20',
    sectionText: 'text-purple-400',
    sectionBorder: 'border-purple-500/30',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-white',
    headerBg: 'bg-green-500/20',
    headerText: 'text-green-400',
    headerBorder: 'border-green-500/30',
    sectionBg: 'bg-green-500/20',
    sectionText: 'text-green-400',
    sectionBorder: 'border-green-500/30',
  },
};

/**
 * Gets the color classes for a category
 * @param color - The category color name
 * @returns Object with all color-related classes
 */
export function getCategoryColorClasses(color: CategoryColor): ColorClasses {
  return COLOR_MAP[color] || COLOR_MAP.pink; // Default to pink if color not found
}

/**
 * Gets classes for a selected item button
 * @param color - The category color
 * @param isSelected - Whether the item is selected
 * @returns className string for the button
 */
export function getItemButtonClasses(color: CategoryColor, isSelected: boolean): string {
  if (isSelected) {
    const colors = getCategoryColorClasses(color);
    return `${colors.bg} ${colors.border} ${colors.text}`;
  }
  return 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600';
}

/**
 * Gets classes for a category header label
 * @param color - The category color
 * @param isActive - Whether any item in this category is selected
 * @returns className string for the label
 */
export function getCategoryHeaderClasses(color: CategoryColor, isActive: boolean): string {
  if (isActive) {
    const colors = getCategoryColorClasses(color);
    return `${colors.headerText}`;
  }
  return 'text-slate-400';
}

/**
 * Gets classes for a section badge
 * @param color - The category color
 * @param isActive - Whether any item in this category is selected
 * @returns className string for the badge
 */
export function getSectionBadgeClasses(color: CategoryColor, isActive: boolean): string {
  if (isActive) {
    const colors = getCategoryColorClasses(color);
    return `${colors.sectionBg} ${colors.sectionText} ${colors.sectionBorder}`;
  }
  return 'bg-slate-800/20 text-slate-500 border-slate-700/30';
}

/**
 * Maps clothing color picker colors to Tailwind classes
 */
const CLOTHING_COLOR_MAP: Record<ClothingColor, ColorClasses> = {
  white: {
    bg: 'bg-white',
    border: 'border-white',
    text: 'text-slate-900',
    headerBg: 'bg-white/20',
    headerText: 'text-white',
    headerBorder: 'border-white/30',
    sectionBg: 'bg-white/20',
    sectionText: 'text-white',
    sectionBorder: 'border-white/30',
  },
  black: {
    bg: 'bg-slate-800',
    border: 'border-slate-800',
    text: 'text-white',
    headerBg: 'bg-slate-800/20',
    headerText: 'text-slate-300',
    headerBorder: 'border-slate-600/30',
    sectionBg: 'bg-slate-800/20',
    sectionText: 'text-slate-300',
    sectionBorder: 'border-slate-600/30',
  },
  gray: {
    bg: 'bg-gray-500',
    border: 'border-gray-500',
    text: 'text-white',
    headerBg: 'bg-gray-500/20',
    headerText: 'text-gray-400',
    headerBorder: 'border-gray-500/30',
    sectionBg: 'bg-gray-500/20',
    sectionText: 'text-gray-400',
    sectionBorder: 'border-gray-500/30',
  },
  red: {
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-white',
    headerBg: 'bg-red-500/20',
    headerText: 'text-red-400',
    headerBorder: 'border-red-500/30',
    sectionBg: 'bg-red-500/20',
    sectionText: 'text-red-400',
    sectionBorder: 'border-red-500/30',
  },
  pink: {
    bg: 'bg-pink-500',
    border: 'border-pink-500',
    text: 'text-white',
    headerBg: 'bg-pink-500/20',
    headerText: 'text-pink-400',
    headerBorder: 'border-pink-500/30',
    sectionBg: 'bg-pink-500/20',
    sectionText: 'text-pink-400',
    sectionBorder: 'border-pink-500/30',
  },
  purple: {
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    text: 'text-white',
    headerBg: 'bg-purple-500/20',
    headerText: 'text-purple-400',
    headerBorder: 'border-purple-500/30',
    sectionBg: 'bg-purple-500/20',
    sectionText: 'text-purple-400',
    sectionBorder: 'border-purple-500/30',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-white',
    headerBg: 'bg-blue-500/20',
    headerText: 'text-blue-400',
    headerBorder: 'border-blue-500/30',
    sectionBg: 'bg-blue-500/20',
    sectionText: 'text-blue-400',
    sectionBorder: 'border-blue-500/30',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-white',
    headerBg: 'bg-green-500/20',
    headerText: 'text-green-400',
    headerBorder: 'border-green-500/30',
    sectionBg: 'bg-green-500/20',
    sectionText: 'text-green-400',
    sectionBorder: 'border-green-500/30',
  },
  yellow: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-400',
    text: 'text-slate-900',
    headerBg: 'bg-yellow-400/20',
    headerText: 'text-yellow-400',
    headerBorder: 'border-yellow-400/30',
    sectionBg: 'bg-yellow-400/20',
    sectionText: 'text-yellow-400',
    sectionBorder: 'border-yellow-400/30',
  },
  orange: {
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    text: 'text-white',
    headerBg: 'bg-orange-500/20',
    headerText: 'text-orange-400',
    headerBorder: 'border-orange-500/30',
    sectionBg: 'bg-orange-500/20',
    sectionText: 'text-orange-400',
    sectionBorder: 'border-orange-500/30',
  },
  brown: {
    bg: 'bg-[#795548]',
    border: 'border-[#795548]',
    text: 'text-white',
    headerBg: 'bg-[#795548]/20',
    headerText: 'text-[#a1887f]',
    headerBorder: 'border-[#795548]/30',
    sectionBg: 'bg-[#795548]/20',
    sectionText: 'text-[#a1887f]',
    sectionBorder: 'border-[#795548]/30',
  },
};

/**
 * Gets classes for a section badge based on selected clothing color
 * @param selectedColor - The color selected from the color picker
 * @returns className string for the badge
 */
export function getSectionBadgeClassesByColor(selectedColor: string | undefined): string {
  if (selectedColor && selectedColor in CLOTHING_COLOR_MAP) {
    const colors = CLOTHING_COLOR_MAP[selectedColor as ClothingColor];
    return `${colors.sectionBg} ${colors.sectionText} ${colors.sectionBorder}`;
  }
  return 'bg-slate-800/20 text-slate-500 border-slate-700/30';
}

/**
 * Gets classes for a category header based on selected clothing color
 * @param selectedColor - The color selected from the color picker
 * @returns className string for the header
 */
export function getCategoryHeaderClassesByColor(selectedColor: string | undefined): string {
  if (selectedColor && selectedColor in CLOTHING_COLOR_MAP) {
    const colors = CLOTHING_COLOR_MAP[selectedColor as ClothingColor];
    return colors.headerText;
  }
  return 'text-slate-400';
}

/**
 * Gets classes for item button based on selected clothing color
 * @param selectedColor - The color selected from the color picker
 * @param isSelected - Whether this specific item is selected
 * @returns className string for the button
 */
export function getItemButtonClassesByColor(selectedColor: string | undefined, isSelected: boolean): string {
  if (isSelected && selectedColor && selectedColor in CLOTHING_COLOR_MAP) {
    const colors = CLOTHING_COLOR_MAP[selectedColor as ClothingColor];
    return `${colors.bg} ${colors.border} ${colors.text}`;
  }
  if (isSelected) {
    return 'bg-slate-700 border-slate-600 text-white';
  }
  return 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600';
}
