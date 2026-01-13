// Appearance-related constants: ethnicity, hair, eyes, skin tones

export const REAL_ETHNICITIES = [
  { id: 'asian', label: 'Asian', img: '/assets/ethnicity/asian.webp' },
  { id: 'caucasian', label: 'White', img: '/assets/ethnicity/caucasian.webp' },
  { id: 'latina', label: 'Latina', img: '/assets/ethnicity/latina.webp' },
  { id: 'black', label: 'Black', img: '/assets/ethnicity/black.webp' },
  { id: 'arab', label: 'Arab', img: '/assets/ethnicity/arab.webp' },
  { id: 'indian', label: 'Indian', img: '/assets/ethnicity/indian.webp' },
];

export const FANTASY_RACES = [
  { id: 'elf', label: 'Elf', img: '/assets/ethnicity/fantasy/elf.webp' },
  { id: 'demon', label: 'Demon', img: '/assets/ethnicity/fantasy/demon.webp' },
  { id: 'catgirl', label: 'Catgirl', img: '/assets/ethnicity/fantasy/catgirl.webp' },
];

// Hair system: Three-tier (Primary Style + Modifiers + Texture)
export const HAIR_PRIMARY_STYLES = [
  { id: 'loose', label: 'Loose', img: '/assets/hair_style/straight.webp' },
  { id: 'ponytail', label: 'Ponytail', img: '/assets/hair_style/ponytail.webp' },
  { id: 'twin-tails', label: 'Twin Tails', img: '/assets/hair_style/twin-tails.webp' },
  { id: 'bun', label: 'Bun', img: '/assets/hair_style/bun.webp' },
  { id: 'braids', label: 'Braids', img: '/assets/hair_style/braids.webp' },
  { id: 'bobcut', label: 'Bob Cut', img: '/assets/hair_style/bobcut.webp' },
  { id: 'short', label: 'Short', img: '/assets/hair_style/short.webp' },
];

export const HAIR_MODIFIERS = [
  { id: '', label: 'None' },
  { id: 'parted', label: 'Parted', img: '/assets/hair_style/parted.webp' },
  { id: 'bangs', label: 'Bangs', img: '/assets/hair_style/bangs.webp' },
];

export const HAIR_TEXTURES = [
  { id: '', label: 'Default' },
  { id: 'straight', label: 'Straight' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'curly', label: 'Curly' },
];

export const HAIR_COLORS = [
  { id: 'blonde', label: 'Blonde', img: '/assets/hair_color/blonde.webp' },
  { id: 'black', label: 'Black', img: '/assets/hair_color/black.webp' },
  { id: 'brown', label: 'Brunette', img: '/assets/hair_color/brown.webp' },
  { id: 'red', label: 'Redhead', img: '/assets/hair_color/red.webp' },
  { id: 'pink', label: 'Pink', img: '/assets/hair_color/pink.webp' },
  { id: 'gray', label: 'Gray', img: '/assets/hair_color/gray.webp' },
  { id: 'blue', label: 'Blue', img: '/assets/hair_color/blue.webp' },
  { id: 'green', label: 'Green', img: '/assets/hair_color/green.webp' },
  { id: 'purple', label: 'Purple', img: '/assets/hair_color/purple.webp' },
  { id: 'custom', label: 'Custom', img: '/assets/hair_color/custom.webp' },
];

export const EYE_COLORS = [
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'green', label: 'Green', color: 'bg-green-500' },
  { id: 'brown', label: 'Brown', color: 'bg-[#795548]' },
  { id: 'red', label: 'Red', color: 'bg-red-600' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-600' },
  { id: 'yellow', label: 'Yellow', color: 'bg-yellow-400' },
  { id: 'black', label: 'Black', color: 'bg-zinc-900' },
  { id: 'white', label: 'Pale', color: 'bg-slate-200' },
];

export const SKIN_TONES = [
  { value: 'pale', label: 'Pale', color: 'bg-[#FFE0BD]' },
  { value: 'fair', label: 'Fair', color: 'bg-[#F3C09A]' },
  { value: 'tan', label: 'Tan', color: 'bg-[#D69D70]' },
  { value: 'olive', label: 'Olive', color: 'bg-[#AD855D]' },
  { value: 'dark', label: 'Dark', color: 'bg-[#6D4C41]' },
  { value: 'black', label: 'Black', color: 'bg-[#3E2723]' },
  { value: 'blue', label: 'Fantasy (Blue)', color: 'bg-blue-300' },
  { value: 'green', label: 'Fantasy (Green)', color: 'bg-green-300' },
];
