/**
 * Redis client singleton for real-time token streaming via pub/sub.
 *
 * Publisher: used by the Temporal activity (llm-generator) to push token deltas.
 * Subscriber: used by the SSE route to receive those deltas instantly.
 *
 * Each Next.js server process and each Temporal worker process maintains its own
 * singleton, which is the correct behaviour (they're separate OS processes).
 *
 * In Next.js dev mode, hot module reloads can create duplicate instances — the
 * globalThis guard below prevents that.
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createClient(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
  });
}

// ─── Publisher singleton ─────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __redis_publisher: Redis | undefined;
}

function getPublisher(): Redis {
  if (!globalThis.__redis_publisher) {
    globalThis.__redis_publisher = createClient();
  }
  return globalThis.__redis_publisher;
}

/**
 * Publish a token delta so the SSE route receives it immediately.
 * Silently no-ops if Redis is unavailable; DB polling acts as fallback.
 */
export async function publishWorkflowDelta(workflowId: string, delta: string): Promise<void> {
  await getPublisher().publish(`workflow:${workflowId}`, delta);
}

// ─── Subscriber singleton ────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __redis_subscriber: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redis_callbacks: Map<string, Set<(message: string) => void>> | undefined;
}

function getSubscriber(): Redis {
  if (!globalThis.__redis_callbacks) {
    globalThis.__redis_callbacks = new Map();
  }

  if (!globalThis.__redis_subscriber) {
    globalThis.__redis_subscriber = createClient();
    globalThis.__redis_subscriber.on('message', (channel: string, message: string) => {
      globalThis.__redis_callbacks?.get(channel)?.forEach(cb => cb(message));
    });
  }

  return globalThis.__redis_subscriber;
}

/**
 * Subscribe to token deltas for a specific workflow.
 *
 * @returns An unsubscribe function — call it when the SSE connection closes.
 */
export async function subscribeToWorkflow(
  workflowId: string,
  callback: (delta: string) => void,
): Promise<() => void> {
  const channel = `workflow:${workflowId}`;
  const subscriber = getSubscriber();
  const callbacks = globalThis.__redis_callbacks!;

  if (!callbacks.has(channel)) {
    callbacks.set(channel, new Set());
    await subscriber.subscribe(channel);
  }
  callbacks.get(channel)!.add(callback);

  return () => {
    const set = callbacks.get(channel);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      callbacks.delete(channel);
      subscriber.unsubscribe(channel).catch(() => {});
    }
  };
}
