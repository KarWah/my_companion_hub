/**
 * Structured Logging Infrastructure
 *
 * Provides centralized, structured logging with different levels and contexts.
 * Uses Pino for high-performance JSON logging with pretty-printing in development.
 *
 * Benefits:
 * - Searchable logs (filter by user, workflow, companion, etc.)
 * - Performance metrics tracking
 * - Production-ready (integrates with log aggregators)
 * - Different log levels (trace, debug, info, warn, error, fatal)
 * - Request tracing with IDs
 */

import pino from 'pino';
import { env } from './env';

const isDevelopment = env.NODE_ENV === 'development';

/**
 * Base logger instance
 * Configured for pretty-printing in dev, JSON in production
 */
export const logger = pino({
  level: env.LOG_LEVEL,

  // Pretty print in development for better readability
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{module} | {msg}',
        },
      }
    : undefined,

  // Base fields included in every log
  base: {
    env: env.NODE_ENV,
  },

  // Custom serializers for common objects
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Module-specific loggers
 * These provide context about which part of the app is logging
 */
export const workflowLogger = logger.child({ module: 'workflow' });
export const dbLogger = logger.child({ module: 'database' });
export const apiLogger = logger.child({ module: 'api' });
export const authLogger = logger.child({ module: 'auth' });
export const temporalLogger = logger.child({ module: 'temporal' });

/**
 * Create a request-scoped logger with tracing information
 *
 * @param module - Module name (e.g., 'workflow', 'api')
 * @param context - Request context (userId, workflowId, etc.)
 * @returns Child logger with context
 *
 * @example
 * const log = createRequestLogger('api', { userId: '123', requestId: 'abc' });
 * log.info('Processing request');
 * // Output: { module: 'api', userId: '123', requestId: 'abc', msg: 'Processing request' }
 */
export function createRequestLogger(
  module: string,
  context: Record<string, unknown>
) {
  return logger.child({ module, ...context });
}

/**
 * Log timing information for operations
 *
 * @example
 * const timer = startTimer();
 * // ... do work ...
 * logger.info({ duration: timer() }, 'Operation completed');
 */
export function startTimer() {
  const start = Date.now();
  return () => Date.now() - start;
}

/**
 * Utility to log errors with full context
 *
 * @param logger - Logger instance
 * @param error - Error object
 * @param context - Additional context
 * @param message - Error message
 */
export function logError(
  logger: pino.Logger,
  error: unknown,
  context: Record<string, unknown>,
  message: string
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(
    {
      ...context,
      error: {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
      },
    },
    message
  );
}

// Log startup information
if (isDevelopment) {
  logger.info('📝 Structured logging initialized (pretty mode)');
} else {
  logger.info({ mode: 'json' }, 'Structured logging initialized');
}
