/**
 * Scene Enhancement Configuration
 *
 * Unlike clothing (which needs filtering), locations and actions are ENHANCED
 * with additional SD tags to improve image quality while preserving LLM freedom.
 */

// --- DEFAULT VALUES ---

export const DEFAULT_SCENE_STATE = {
  location: "living room",
  action: "looking at viewer",
  lighting: "cinematic lighting",
  expression: "neutral"
} as const;

// --- LOCATION ENHANCEMENTS ---

/**
 * Location-specific lighting and atmosphere suggestions
 * These are AUTO-ADDED to SD prompts when location matches
 */
export const LOCATION_ENHANCEMENTS: Record<string, {
  lighting?: string;
  atmosphere?: string;
  commonProps?: string[];
}> = {
  // Indoor locations
  "bedroom": {
    lighting: "soft lighting, warm tones",
    atmosphere: "intimate, cozy",
    commonProps: ["bed", "pillows", "sheets"]
  },
  "living room": {
    lighting: "natural light, ambient",
    atmosphere: "comfortable, casual",
    commonProps: ["couch", "sofa"]
  },
  "kitchen": {
    lighting: "bright, clean lighting",
    atmosphere: "modern, clean",
    commonProps: ["counter", "kitchen counter"]
  },
  "bathroom": {
    lighting: "bright, fluorescent",
    atmosphere: "clean, modern",
    commonProps: ["mirror", "tiles"]
  },
  "gym": {
    lighting: "bright, high contrast",
    atmosphere: "energetic, athletic",
    commonProps: ["weights", "equipment", "mat"]
  },
  "office": {
    lighting: "neutral lighting",
    atmosphere: "professional, clean",
    commonProps: ["desk", "chair", "computer"]
  },

  // Outdoor locations
  "park": {
    lighting: "natural sunlight, outdoors",
    atmosphere: "peaceful, nature",
    commonProps: ["trees", "grass", "bench"]
  },
  "beach": {
    lighting: "bright sunlight, golden hour",
    atmosphere: "relaxed, tropical",
    commonProps: ["sand", "ocean", "waves"]
  },
  "street": {
    lighting: "natural daylight",
    atmosphere: "urban, city",
    commonProps: ["buildings", "sidewalk"]
  },
  "car": {
    lighting: "car interior lighting",
    atmosphere: "confined, intimate",
    commonProps: ["car seat", "dashboard", "interior"]
  },

  // Special locations
  "shower": {
    lighting: "wet, steam, water drops",
    atmosphere: "intimate, wet",
    commonProps: ["shower", "water", "steam", "tiles"]
  },
  "pool": {
    lighting: "bright, reflective water",
    atmosphere: "wet, summery",
    commonProps: ["pool", "water", "wet"]
  },
  "hot tub": {
    lighting: "dim, steam, mood lighting",
    atmosphere: "intimate, relaxed",
    commonProps: ["hot tub", "water", "steam"]
  }
};

/**
 * Enhance location with appropriate lighting and atmosphere tags
 * Returns enhanced prompt additions, never modifies the original location
 */
export function enhanceLocation(location: string): string {
  if (!location) return "";

  const locationLower = location.toLowerCase();

  // Check for exact or partial matches
  for (const [key, enhancement] of Object.entries(LOCATION_ENHANCEMENTS)) {
    if (locationLower.includes(key)) {
      const additions: string[] = [];

      if (enhancement.lighting) {
        additions.push(enhancement.lighting);
      }

      if (enhancement.atmosphere) {
        additions.push(enhancement.atmosphere);
      }

      // Only add common props if location is fairly generic
      // Don't override specific descriptions
      if (enhancement.commonProps && locationLower === key) {
        // Location is generic (just "bedroom"), add props
        additions.push(...enhancement.commonProps);
      }

      return additions.join(", ");
    }
  }

  // No enhancement found - location is passed as-is (could be custom like "rooftop garden")
  return "";
}

// --- ACTION POSE ENHANCEMENTS ---

/**
 * Common action/pose suggestions that work well with SD
 * These help standardize common poses for better consistency
 */
export const ACTION_POSE_LIBRARY = {
  // Camera-facing
  neutral: "looking at viewer, standing",
  selfie: "taking selfie, looking at viewer, holding phone",
  portrait: "portrait, looking at viewer, front view",

  // Sitting/Resting
  sittingCouch: "sitting on couch, relaxed pose",
  sittingChair: "sitting on chair, crossed legs",
  lyingBed: "lying on bed, on back",
  lyingSide: "lying on side, relaxed",

  // Dynamic
  stretching: "stretching, arms up",
  bending: "bending over, leaning forward",
  reaching: "reaching up, arms extended",
  turning: "turning around, looking back",

  // Athletic
  workout: "workout pose, athletic stance",
  yoga: "yoga pose, stretching",
  running: "running, motion, dynamic",

  // Intimate
  leaning: "leaning against wall, casual pose",
  kneeling: "kneeling, on knees",
  armsUp: "arms above head, stretched",
  handsOnHips: "hands on hips, confident pose"
} as const;

/**
 * Enhance action with SD-friendly pose keywords
 * Does NOT restrict what actions can be used
 */
export function enhanceAction(action: string): string {
  if (!action) return DEFAULT_SCENE_STATE.action;

  const actionLower = action.toLowerCase();

  // Check if action matches a known pose for enhancement
  // This adds SD-specific tags to help with composition
  if (actionLower.includes("selfie") || actionLower.includes("taking a picture")) {
    return `${action}, looking at viewer, holding phone`;
  }

  if (actionLower.includes("sitting") && actionLower.includes("couch")) {
    return `${action}, on couch`;
  }

  if (actionLower.includes("lying") && actionLower.includes("bed")) {
    return `${action}, on bed`;
  }

  if (actionLower.includes("stretching") || actionLower.includes("workout")) {
    return `${action}, athletic pose`;
  }

  // For most actions, pass through unchanged
  // LLM's natural description is best
  return action;
}

// --- TIME/LIGHTING HELPERS ---

/**
 * Time-based lighting suggestions
 * Could be used if companion tracks time of day
 */
export const TIME_LIGHTING = {
  morning: "morning light, soft sunlight, golden hour",
  afternoon: "bright daylight, natural lighting",
  evening: "warm evening light, sunset glow",
  night: "night, dim lighting, mood lighting, dark",
  lateNight: "very dim, dark, intimate lighting"
} as const;

/**
 * Weather-based atmosphere (if implemented)
 */
export const WEATHER_ATMOSPHERE = {
  sunny: "bright, sunny, clear sky",
  cloudy: "overcast, soft diffused light",
  rainy: "rainy, wet, water drops, moody",
  snowy: "snowy, cold, winter atmosphere"
} as const;
