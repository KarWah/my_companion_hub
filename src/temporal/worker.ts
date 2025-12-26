import 'dotenv/config';
import { Worker } from '@temporalio/worker';
import * as activities from './activities';
import { fileURLToPath } from 'url';
import path from 'path';
import { validateEnv, env } from '../lib/env';
import { temporalLogger } from '../lib/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  // Validate environment variables first
  validateEnv();

  temporalLogger.info('Starting Temporal worker...');

  const worker = await Worker.create({
    workflowsPath: path.join(__dirname, 'workflows.ts'),
    activities,
    taskQueue: 'companion-chat-queue',
  });

  temporalLogger.info({
    taskQueue: 'companion-chat-queue',
    temporalAddress: env.TEMPORAL_ADDRESS,
  }, '🤖 Temporal Worker Online');

  await worker.run();
}

run().catch((err) => {
  temporalLogger.fatal({ error: err }, 'Temporal worker failed to start');
  process.exit(1);
});