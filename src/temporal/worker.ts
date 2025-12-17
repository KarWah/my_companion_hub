import 'dotenv/config';
import { Worker } from '@temporalio/worker';
import * as activities from './activities';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const worker = await Worker.create({
    workflowsPath: path.join(__dirname, 'workflows.ts'),
    activities,
    taskQueue: 'companion-chat-queue',
  });

  console.log("🤖 Temporal Worker Online");
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});