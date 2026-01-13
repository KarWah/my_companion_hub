// Clothing-related constants: presets, categories, colors

// Clothing presets organized by logical layers
export const CLOTHING_PRESETS = {
  outerwear: ['None', 'Hoodie', 'Jacket', 'Blazer', 'Cardigan', 'Coat', 'Sweater', 'Sweatshirt'],
  top: ['None', 'T-Shirt', 'Tank Top', 'Crop Top', 'Blouse', 'Shirt', 'Tube Top', 'Halter Top', 'Camisole'],
  bottom: ['None', 'Jeans', 'Pants', 'Skirt', 'Shorts', 'Leggings', 'Sweatpants'],
  fullCoverage: ['None', 'Dress', 'Jumpsuit', 'Romper', 'Bodysuit', 'Robe'],
  underwearTop: ['None', 'Bra', 'Sports Bra', 'Bikini Top'],
  underwearBottom: ['None', 'Panties', 'Thong', 'Boxers', 'Briefs', 'Bikini Bottom'],
  legwear: ['None', 'Socks', 'Stockings', 'Tights', 'Knee-highs', 'Thigh-highs'],
  footwear: ['None', 'Sneakers', 'Heels', 'Boots', 'Sandals', 'Flats', 'Slippers']
};

// Category labels for UI
export const CLOTHING_CATEGORY_LABELS: { [key: string]: { label: string; section: string; color: string } } = {
  outerwear: { label: 'Outerwear', section: 'OUTERWEAR', color: 'cyan' },
  top: { label: 'Top', section: 'TOPS', color: 'pink' },
  bottom: { label: 'Bottom', section: 'BOTTOMS', color: 'blue' },
  fullCoverage: { label: 'Full Coverage', section: 'FULL COVERAGE', color: 'indigo' },
  underwearTop: { label: 'Underwear Top', section: 'UNDERWEAR', color: 'rose' },
  underwearBottom: { label: 'Underwear Bottom', section: 'UNDERWEAR', color: 'orange' },
  legwear: { label: 'Legwear', section: 'LEGWEAR', color: 'purple' },
  footwear: { label: 'Footwear', section: 'FOOTWEAR', color: 'green' }
};

export const CLOTHING_COLORS = [
  { id: 'white', label: 'White', color: 'bg-white border-2 border-slate-700' },
  { id: 'black', label: 'Black', color: 'bg-black' },
  { id: 'gray', label: 'Gray', color: 'bg-gray-500' },
  { id: 'red', label: 'Red', color: 'bg-red-500' },
  { id: 'pink', label: 'Pink', color: 'bg-pink-400' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'green', label: 'Green', color: 'bg-green-500' },
  { id: 'yellow', label: 'Yellow', color: 'bg-yellow-400' },
  { id: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { id: 'brown', label: 'Brown', color: 'bg-[#795548]' },
];
