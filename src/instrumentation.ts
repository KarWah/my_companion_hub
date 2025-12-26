/**
 * Next.js Instrumentation File
 *
 * This file runs once when the Next.js server starts up.
 * It's the perfect place to validate environment variables and initialize services.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');

    // Validate environment variables first
    // This will throw and prevent the app from starting if misconfigured
    validateEnv();

    console.log('✓ Server instrumentation complete');
  }
}
