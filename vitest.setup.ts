/**
 * Vitest Setup File
 *
 * Global configuration and mocks for all test files.
 * Runs once before all tests.
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock Prisma globally
vi.mock('@/lib/prisma', async () => {
  const prisma = await import('./src/__mocks__/prisma');
  return prisma;
});

// Mock logger globally
vi.mock('@/lib/logger', async () => {
  const logger = await import('./src/__mocks__/logger');
  return logger;
});

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    OPENAI_API_KEY: 'test-openai-key',
    NOVITA_KEY: 'test-novita-key',
    SD_API_URL: 'http://localhost:7860',
    TEMPORAL_ADDRESS: 'localhost:7233',
    LOG_LEVEL: 'silent',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
  }
}));

// Setup global fetch mock
global.fetch = vi.fn();

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset fetch mock to default behavior
  (global.fetch as any).mockReset();
});

// Cleanup after each test
afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Clear all timers
  vi.clearAllTimers();
});

// Suppress console errors in tests (optional - remove if you want to see them)
// global.console.error = vi.fn();
// global.console.warn = vi.fn();
