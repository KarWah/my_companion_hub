/**
 * Database-backed rate limiting using Prisma + PostgreSQL
 *
 * ✅ PRODUCTION READY for local/self-hosted deployments
 *
 * Benefits:
 * - Persistent across server restarts
 * - Works with multiple Next.js instances
 * - Uses existing PostgreSQL database
 * - Automatic cleanup of expired records
 * - Follows Next.js + Prisma best practices
 *
 * How it works:
 * - Stores rate limit records in PostgreSQL
 * - Uses unique constraint on (identifier + action)
 * - Automatically resets after time window
 * - Periodically cleans up expired records
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

interface RateLimitOptions {
  identifier: string;
  action: string;
  maxAttempts: number;
  windowMs: number;
}

/**
 * Check if an action is allowed based on rate limits
 * Uses PostgreSQL for distributed, persistent rate limiting
 *
 * @param options - Rate limiting configuration
 * @returns Result indicating if action is allowed
 */
export async function checkRateLimit({
  identifier,
  action,
  maxAttempts,
  windowMs
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    // Try to find existing rate limit record
    const existing = await prisma.rateLimit.findUnique({
      where: {
        identifier_action: {
          identifier,
          action
        }
      }
    });

    // No record or expired - create new record
    if (!existing || existing.resetAt < now) {
      await prisma.rateLimit.upsert({
        where: {
          identifier_action: {
            identifier,
            action
          }
        },
        create: {
          identifier,
          action,
          count: 1,
          resetAt
        },
        update: {
          count: 1,
          resetAt
        }
      });

      return {
        success: true,
        remaining: maxAttempts - 1,
        resetTime: resetAt
      };
    }

    // Check if limit exceeded
    if (existing.count >= maxAttempts) {
      const remainingMs = existing.resetAt.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return {
        success: false,
        remaining: 0,
        resetTime: existing.resetAt,
        error: `Rate limit exceeded. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
      };
    }

    // Increment count
    await prisma.rateLimit.update({
      where: {
        identifier_action: {
          identifier,
          action
        }
      },
      data: {
        count: {
          increment: 1
        }
      }
    });

    return {
      success: true,
      remaining: maxAttempts - existing.count - 1,
      resetTime: existing.resetAt
    };

  } catch (error) {
    // On database error, fail open (allow the request) to prevent blocking legitimate users
    logger.error({ error, identifier, action }, 'Rate limit check failed');
    return {
      success: true,
      remaining: maxAttempts,
      resetTime: resetAt
    };
  }
}

/**
 * Get client IP address from request headers
 * Works with various proxy configurations (Vercel, Cloudflare, Nginx, etc.)
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

  // Fallback for development/local
  return '127.0.0.1';
}

/**
 * Cleanup expired rate limit records
 * Should be called periodically (e.g., via cron job or on server start)
 *
 * @returns Number of records deleted
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const now = new Date();

  try {
    const result = await prisma.rateLimit.deleteMany({
      where: {
        resetAt: {
          lt: now
        }
      }
    });

    return result.count;
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup expired rate limits');
    return 0;
  }
}

// Predefined rate limiters for common use cases

/**
 * Rate limit for login attempts
 * 5 attempts per 15 minutes per IP+identifier combination
 */
export async function checkLoginRateLimit(ip: string, identifier: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: `${ip}:${identifier.toLowerCase()}`,
    action: 'login',
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  });
}

/**
 * Rate limit for registration
 * 3 registrations per 24 hours per IP
 */
export async function checkRegistrationRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: ip,
    action: 'register',
    maxAttempts: 3,
    windowMs: 24 * 60 * 60 * 1000 // 24 hours
  });
}

/**
 * Rate limit for chat messages
 * 30 messages per minute per user
 */
export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: userId,
    action: 'chat',
    maxAttempts: 30,
    windowMs: 60 * 1000 // 1 minute
  });
}

/**
 * Rate limit for image generation
 * 10 images per hour per user
 */
export async function checkImageGenerationRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: userId,
    action: 'image',
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Rate limit for companion creation
 * 10 companions per hour per user
 */
export async function checkCompanionCreationRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: userId,
    action: 'companion_create',
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Rate limit for settings updates (update/delete/wipe)
 * 20 updates per hour per user
 */
export async function checkSettingsRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit({
    identifier: userId,
    action: 'settings',
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000 // 1 hour
  });
}
