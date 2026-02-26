/**
 * Prisma Mock for Testing
 *
 * Provides mock implementations of Prisma client methods using Vitest.
 * All methods return mock functions that can be configured in individual tests.
 */

import { vi } from 'vitest';

const prisma = {
  companion: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  memory: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  workflowExecution: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  rateLimitEntry: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prisma)),
  $executeRaw: vi.fn().mockResolvedValue(1),
};

export default prisma;
