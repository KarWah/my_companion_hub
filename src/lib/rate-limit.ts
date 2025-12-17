/**
 * In-memory rate limiting utility
 *
 * ⚠️ PRODUCTION WARNING ⚠️
 *
 * This implementation uses IN-MEMORY storage and has important limitations:
 *
 * ❌ NOT SUITABLE FOR:
 * - Serverless deployments (Vercel, AWS Lambda, etc.)
 * - Multi-instance/clustered deployments
 * - Load-balanced applications
 * - Production environments requiring strict rate limiting
 *
 * ✅ SUITABLE FOR:
 * - Development and testing
 * - Single-instance deployments
 * - Prototype applications
 *
 * WHY IT DOESN'T WORK IN PRODUCTION:
 * - Each serverless function has separate memory (rate limits not shared)
 * - Users can bypass limits by hitting different instances
 * - Memory resets between cold starts
 * - setInterval cleanup doesn't work reliably in serverless
 *
 * RECOMMENDED PRODUCTION SOLUTION:
 *
 * Use @upstash/ratelimit with Redis for distributed rate limiting:
 *
 * ```bash
 * npm install @upstash/ratelimit @upstash/redis
 * ```
 *
 * ```typescript
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * export const loginRateLimit = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(5, "15 m"),
 *   analytics: true,
 * });
 * ```
 *
 * Then replace checkLoginRateLimit() calls with:
 * ```typescript
 * const { success } = await loginRateLimit.limit(identifier);
 * ```
 */

// ⚠️ IN-MEMORY STORE - NOT PRODUCTION READY
if (process.env.NODE_ENV === 'production' && !process.env.SUPPRESS_RATE_LIMIT_WARNING) {
  console.warn(
    '\n⚠️  WARNING: Using in-memory rate limiting in production!\n' +
    'This will NOT work correctly on serverless platforms like Vercel.\n' +
    'Please upgrade to Redis-based rate limiting using @upstash/ratelimit.\n' +
    'See src/lib/rate-limit.ts for implementation details.\n' +
    'Set SUPPRESS_RATE_LIMIT_WARNING=true to hide this warning.\n'
  );
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (NOT shared across serverless instances!)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes to prevent memory leaks
// NOTE: This won't run reliably in serverless environments
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  identifier: string;
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
}

/**
 * Check if an action is allowed based on rate limits
 *
 * @param options - Rate limiting configuration
 * @returns Result indicating if action is allowed
 */
export function checkRateLimit({
  identifier,
  maxAttempts,
  windowMs
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // No record or window expired - allow and create new record
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime
    });

    return {
      success: true,
      remaining: maxAttempts - 1,
      resetTime
    };
  }

  // Check if limit exceeded
  if (record.count >= maxAttempts) {
    const remainingMs = record.resetTime - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      error: `Rate limit exceeded. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
    };
  }

  // Increment count and allow
  record.count++;

  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Get client IP address from request headers
 * Works with various proxy configurations (Vercel, Cloudflare, etc.)
 */
export function getClientIp(headers: Headers): string {
  // Check common headers in order of priority
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback for development
  return 'unknown';
}

// Predefined rate limiters for common use cases

/**
 * Rate limit for login attempts
 * 5 attempts per 15 minutes per IP+identifier combination
 */
export function checkLoginRateLimit(ip: string, identifier: string): RateLimitResult {
  return checkRateLimit({
    identifier: `login:${ip}:${identifier.toLowerCase()}`,
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  });
}

/**
 * Rate limit for registration
 * 3 registrations per 24 hours per IP
 */
export function checkRegistrationRateLimit(ip: string): RateLimitResult {
  return checkRateLimit({
    identifier: `register:${ip}`,
    maxAttempts: 3,
    windowMs: 24 * 60 * 60 * 1000 // 24 hours
  });
}

/**
 * Rate limit for chat messages
 * 30 messages per minute per user
 */
export function checkChatRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    identifier: `chat:${userId}`,
    maxAttempts: 30,
    windowMs: 60 * 1000 // 1 minute
  });
}

/**
 * Rate limit for image generation
 * 10 images per hour per user
 */
export function checkImageGenerationRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    identifier: `image:${userId}`,
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Rate limit for companion creation
 * 10 companions per hour per user
 */
export function checkCompanionCreationRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    identifier: `companion:create:${userId}`,
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Rate limit for settings updates (update/delete/wipe)
 * 20 updates per hour per user
 */
export function checkSettingsRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    identifier: `settings:${userId}`,
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}
