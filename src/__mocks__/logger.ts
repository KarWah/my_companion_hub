/**
 * Logger Mock for Testing
 *
 * Provides mock implementations of logger functions using Vitest.
 * All log methods are silent mocks that can be spied on in tests.
 */

import { vi } from 'vitest';

// Create a mock logger object with all pino methods
const createMockLogger = () => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(function(this: any) {
    return createMockLogger();
  }),
  level: 'info',
  silent: vi.fn(),
});

export const logger = createMockLogger();
export const workflowLogger = createMockLogger();
export const dbLogger = createMockLogger();
export const apiLogger = createMockLogger();
export const authLogger = createMockLogger();
export const temporalLogger = createMockLogger();

export const createRequestLogger = vi.fn(() => createMockLogger());

export const startTimer = vi.fn(() => vi.fn(() => 100)); // Mock returns 100ms

export const logError = vi.fn();
