/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at application startup.
 * This ensures the app fails fast with clear error messages if misconfigured.
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NOVITA_KEY',
  'SD_API_URL',
] as const;

const optionalEnvVars = [
  'TEMPORAL_ADDRESS',
  'LOG_LEVEL',
  'NODE_ENV',
  'NOVITA_MODEL',        // LLM model name (hot-swappable without redeploy)
  'ELEVENLABS_API_KEY',  // Voice TTS (free tier)
  'CRON_SECRET',         // Secret for cron endpoint auth
  'REDIS_URL',           // Redis connection URL for real-time token streaming
  'SFW_MODE',        // Set to 'true' to suppress explicit content in prompts and UI
] as const;

/**
 * Validates that all required environment variables are present and non-empty
 * @throws {Error} If any required environment variable is missing or empty
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const empty: string[] = [];

  for (const key of requiredEnvVars) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
    } else if (value.trim() === '') {
      empty.push(key);
    }
  }

  if (missing.length > 0 || empty.length > 0) {
    const errors: string[] = [];

    if (missing.length > 0) {
      errors.push(`❌ Missing environment variables:\n   ${missing.join('\n   ')}`);
    }

    if (empty.length > 0) {
      errors.push(`❌ Empty environment variables:\n   ${empty.join('\n   ')}`);
    }

    const errorMessage = [
      '═══════════════════════════════════════════════════════',
      '  ENVIRONMENT VALIDATION FAILED',
      '═══════════════════════════════════════════════════════',
      '',
      ...errors,
      '',
      'Please check your .env file and ensure all required variables are set.',
      'See .env.example for reference.',
      '═══════════════════════════════════════════════════════',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log successful validation
  console.log('✓ Environment validation passed');

  // Log optional variables that are set
  const setOptional = optionalEnvVars.filter(key => process.env[key]);
  if (setOptional.length > 0) {
    console.log(`✓ Optional variables set: ${setOptional.join(', ')}`);
  }
}

/**
 * Type-safe environment variable access
 * Only use after validateEnv() has been called
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  NOVITA_KEY: process.env.NOVITA_KEY!,
  SD_API_URL: process.env.SD_API_URL!,

  // Optional with defaults
  TEMPORAL_ADDRESS: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // LLM model and API URL (hot-swappable via env vars)
  NOVITA_MODEL: process.env.NOVITA_MODEL || 'sao10k/l31-70b-euryale-v2.2',
  NOVITA_API_URL: process.env.NOVITA_API_URL || 'https://api.novita.ai/v3/openai/chat/completions',

  // Voice TTS (ElevenLabs)
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',

  // Cron endpoint security
  CRON_SECRET: process.env.CRON_SECRET || '',

  // Redis for real-time token streaming (defaults to local dev instance)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // OpenAI API key for semantic embeddings (memory system)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // SFW mode — disables explicit content in LLM prompts, image gen, and UI
  SFW_MODE: process.env.SFW_MODE === 'true',
} as const;
