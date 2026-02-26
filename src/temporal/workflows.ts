import type { WorkflowProgress, ChatWorkflowArgs, WorkflowResult } from '@/types';
import { proxyActivities, defineQuery, defineSignal, setHandler, workflowInfo } from '@temporalio/workflow';
import type * as activities from './activities';

const { analyzeContext } = proxyActivities<typeof activities>({
  startToCloseTimeout: '60 seconds',
  retry: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2, maximumInterval: '10s' },
});

const { generateLLMResponse } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 minutes',
  retry: { maximumAttempts: 2, initialInterval: '2s', backoffCoefficient: 2, maximumInterval: '10s' },
});

const { generateSDPrompt } = proxyActivities<typeof activities>({
  startToCloseTimeout: '60 seconds',
  retry: { maximumAttempts: 2, initialInterval: '2s', backoffCoefficient: 2, maximumInterval: '10s' },
});

const { generateCompanionImage } = proxyActivities<typeof activities>({
  startToCloseTimeout: '4 minutes',
  retry: { maximumAttempts: 2, initialInterval: '5s', backoffCoefficient: 2, maximumInterval: '30s' },
});

const { generateVoiceAudio } = proxyActivities<typeof activities>({
  startToCloseTimeout: '60 seconds',
  retry: { maximumAttempts: 2, initialInterval: '2s', backoffCoefficient: 2, maximumInterval: '10s' },
});

const { updateCompanionContext } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3, initialInterval: '1s', backoffCoefficient: 2, maximumInterval: '10s' },
});

const { retrieveRelevantMemories } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 2, initialInterval: '1s', backoffCoefficient: 2, maximumInterval: '5s' },
});

const { extractAndStoreMemories } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 1 }, // Don't retry — memory extraction failure is non-critical
});


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
  currentMood = 'neutral',
  msgHistory,
  shouldGenerateImage,
  voiceEnabled = false,
  voiceId,
  ragEnabled = true,
  deepThink = false,
  userMessageId,
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

  // Retrieve memories if RAG is enabled (degrades gracefully without embeddings)
  let memories: string[] = [];
  if (ragEnabled) {
    const memResult = await retrieveRelevantMemories(companionId, userMessage);
    memories = memResult.memories.map(m => m.content);
  }

  const reply = await generateLLMResponse(
    companionId,
    userMessage,
    msgHistory,
    initialContext,
    initialContext.isUserPresent,
    userName,
    memories,
    wfId,
    deepThink,
  );

  updateProgress({
    progress: 70,
    streamedText: reply
  });

  // Start memory extraction concurrently — runs in parallel with re-analysis and image/voice.
  // Non-critical: failure is swallowed in the activity, so this never blocks the response.
  const memoryExtractionPromise = ragEnabled
    ? extractAndStoreMemories(
        companionId,
        companionName,
        userName,
        userMessage,
        reply,
        msgHistory.slice(-4),
        userMessageId ?? 'unknown',
      )
    : Promise.resolve();

  // Step 3: Re-analyze context (70-80%)
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
    finalContext.action !== currentAction ||
    finalContext.mood !== currentMood;

  if (anyContextChanged) {
    updateProgress({ currentStep: 'Saving context...' });
    await updateCompanionContext(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.action,
      finalContext.mood,
    );
  }

  updateProgress({ progress: 85 });

  // Step 5: Generate voice audio (85-90%)
  let audioUrl: string | null = null;

  if (voiceEnabled && voiceId) {
    updateProgress({
      status: 'responding',
      progress: 85,
      currentStep: 'Generating voice...'
    });

    const voiceResult = await generateVoiceAudio(
      companionId,
      voiceId,
      reply
    );

    audioUrl = voiceResult.audioUrl;
    updateProgress({ progress: 90, audioUrl });
  }

  // Step 6: Generate image (90-100%)
  let imageUrl = null;

  if (shouldGenerateImage) {
    // Step 6a: Build the SD prompt using a dedicated LLM that understands
    // SD syntax, character identity anchoring, and action-to-pose translation.
    // Passes the full conversation (history + latest exchange) alongside all
    // scene context so the prompt accurately reflects what just happened.
    updateProgress({
      status: 'imaging',
      progress: voiceEnabled ? 90 : 85,
      currentStep: 'Crafting scene...'
    });

    const sdPrompt = await generateSDPrompt(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.action,      // was previously dropped — now explicitly included
      finalContext.visualTags,
      finalContext.expression,
      finalContext.lighting,
      finalContext.isUserPresent,
      userMessage,
      reply,
      msgHistory,               // recent history for pose/scene context
      companionName,
      userName,
    );

    // Step 6b: Call SD API with the LLM-crafted prompt
    updateProgress({ currentStep: 'Generating image...' });

    imageUrl = await generateCompanionImage(
      companionId,
      sdPrompt.positive,
      sdPrompt.negative,
      sdPrompt.cfg_scale,
      sdPrompt.steps,
    );
  }

  // Await memory extraction (started concurrently after LLM response — should already be done)
  await memoryExtractionPromise;

  // Final step
  updateProgress({
    status: 'completed',
    progress: 100,
    currentStep: 'Complete!',
    imageUrl,
    audioUrl
  });

  const result: WorkflowResult = {
    text: reply,
    imageUrl: imageUrl,
    audioUrl: audioUrl,
    updatedState: {
      outfit: finalContext.outfit,
      location: finalContext.location,
      action: finalContext.action,
      expression: finalContext.expression
    }
  };

  return result;
}