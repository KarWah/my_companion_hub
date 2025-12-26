import { proxyActivities, defineQuery, defineSignal, setHandler, workflowInfo } from '@temporalio/workflow';
import type * as activities from './activities';

const {
  generateLLMResponse,
  analyzeContext,
  generateCompanionImage,
  updateCompanionContext
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '10s',
  },
});

import type { WorkflowProgress, ChatWorkflowArgs, WorkflowResult } from '@/types/workflow';

export const progressQuery = defineQuery<WorkflowProgress>('progress');
export const textTokenSignal = defineSignal<[string]>('textToken');

export async function ChatWorkflow({
  companionId,
  companionName,
  userMessage,
  userName,
  currentOutfit,
  currentLocation,
  currentAction,
  msgHistory,
  shouldGenerateImage
}: ChatWorkflowArgs) {

  // Get workflow ID for streaming
  const wfId = workflowInfo().workflowId;

  // Initialize progress state
  let currentProgress: WorkflowProgress = {
    status: 'started',
    progress: 0,
    currentStep: 'Starting...',
    streamedText: ''
  };

  // Set up query handler for progress polling
  setHandler(progressQuery, () => currentProgress);

  // Set up signal handler for streamed tokens from activity
  setHandler(textTokenSignal, (token: string) => {
    currentProgress.streamedText += token;
  });

  // Helper to update progress
  const updateProgress = (update: Partial<WorkflowProgress>) => {
    currentProgress = { ...currentProgress, ...update };
  };

  // Step 1: Initial context analysis (10-30%)
  updateProgress({
    status: 'analyzing',
    progress: 10,
    currentStep: 'Analyzing message...'
  });

  const initialContext = await analyzeContext(
    currentOutfit,
    currentLocation,
    currentAction,
    userMessage,
    msgHistory,
    companionName,
    userName,
    "",
  );

  updateProgress({ progress: 30 });

  // Step 2: Generate LLM response with streaming (30-70%)
  updateProgress({
    status: 'responding',
    progress: 30,
    currentStep: `${companionName} is thinking...`
  });

  const reply = await generateLLMResponse(
    companionId,
    userMessage,
    msgHistory,
    initialContext,
    initialContext.isUserPresent,
    userName,
    wfId
  );

  updateProgress({
    progress: 70,
    streamedText: reply
  });

  // Step 3: Re-analyze (70-80%)
  updateProgress({
    status: 'analyzing',
    progress: 70,
    currentStep: 'Updating context...'
  });

  const updatedHistory: { role: "user" | "assistant"; content: string }[] = [
    ...msgHistory,
    { role: 'user' as const, content: userMessage },
    { role: 'assistant' as const, content: reply }
  ];

  const finalContext = await analyzeContext(
    currentOutfit,
    currentLocation,
    currentAction,
    userMessage,
    updatedHistory,
    companionName,
    userName,
    reply
  );

  updateProgress({ progress: 80 });

  // Step 4: Update DB (80-85%)
  const anyContextChanged =
    finalContext.outfit !== currentOutfit ||
    finalContext.location !== currentLocation ||
    finalContext.action !== currentAction;

  if (anyContextChanged) {
    updateProgress({ currentStep: 'Saving context...' });
    await updateCompanionContext(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.action
    );
  }

  updateProgress({ progress: 85 });

  // Step 5: Generate image (85-100%)
  let imageUrl = null;

  if (shouldGenerateImage) {
    updateProgress({
      status: 'imaging',
      progress: 85,
      currentStep: 'Generating image...'
    });

    imageUrl = await generateCompanionImage(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.visualTags,
      finalContext.expression,
      finalContext.isUserPresent,
      finalContext.lighting,
    );
  }

  // Final step
  updateProgress({
    status: 'completed',
    progress: 100,
    currentStep: 'Complete!',
    imageUrl
  });

  const result: WorkflowResult = {
    text: reply,
    imageUrl: imageUrl,
    updatedState: {
      outfit: finalContext.outfit,
      location: finalContext.location,
      action: finalContext.action,
      expression: finalContext.expression
    }
  };

  return result;
}