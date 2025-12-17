// Image Generation Configuration
export const IMAGE_GENERATION_DEFAULTS = {
  dimensions: {
    width: 832,
    height: 1216,
  },
  sampling: {
    steps: 28,
    sampler: "DPM++ 2M",
    scheduler: "karras",
    cfgScale: 6,
    seed: -1,
  },
  lora: {
    name: "[inukai mofu] Artist Style Illustrious_2376885",
    weight: 0.4,
  },
  qualityTags: {
    positive: "(masterpiece, best quality:1.2), absurdres, highres, cinematic light, uncensored",
    negative: "(bad quality:1.15), (worst quality:1.3), neghands, monochrome, 3d, long neck, ugly fingers, ugly hands, ugly, easynegative, text, watermark, deformed, mutated, cropped, ugly, disfigured, deformed face, ugly face, non-detailed, realistic",
  },
} as const;

// Default scene state values
export const DEFAULT_COMPANION_STATE = {
  outfit: "casual clothes",
  location: "living room",
  action: "looking at viewer",
  lighting: "cinematic lighting",
  expression: "neutral"
} as const;

// LLM Configuration
export const CONTEXT_ANALYSIS_CONFIG = {
  temperature: 0.2,
  maxTokens: 600,
  historyLimit: 8, // Number of recent messages to include
} as const;

export const LLM_CHAT_CONFIG = {
  temperature: 0.9,
  maxTokens: 150, // Reduced from 450 to enforce brevity (1-3 sentences)
  topP: 0.9,
} as const;

export const LLM_MODEL = "sao10k/l31-70b-euryale-v2.2" as const;
