/**
 * Temporal Activities - Thin Orchestration Layer
 *
 * This file serves as the main entry point for Temporal workflow activities.
 * It delegates to specialized modules for maintainability and testability.
 *
 * Refactored: 2026-01-12
 * - Extracted large functions into focused modules
 * - Centralized configuration (checkpoints, prompts, patterns)
 * - Added automatic checkpoint selection based on companion.style
 * - Improved code organization and maintainability
 */

import type { MessageHistory, ContextAnalysis } from '@/types';
import { workflowLogger, logError } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Import refactored activity modules
import { analyzeConversationContext } from './activities/context-analyzer';
import { generateLLMResponse as generateResponse } from './activities/llm-generator';
import { generateCompanionImage as generateImage } from './activities/image-generator';
import { generateSDPrompt as generateSDPromptActivity, type SDPromptResult } from './activities/sd-prompt-generator';
import { extractAndStoreMemories } from './activities/memory-extractor';
import { retrieveRelevantMemories } from './activities/memory-retriever';
import { generateVoiceAudio as generateVoice } from './activities/voice-generator';

/**
 * Analyzes conversation context to extract visual state for image generation
 *
 * Delegates to context-analyzer module for focused implementation.
 *
 * @see {import('./activities/context-analyzer').analyzeConversationContext}
 */
export async function analyzeContext(
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  userMessage: string,
  history: MessageHistory[],
  companionName: string,
  userName: string,
  aiResponse: string
): Promise<ContextAnalysis> {
  return await analyzeConversationContext(
    currentOutfit,
    currentLocation,
    currentAction,
    userMessage,
    history,
    companionName,
    userName,
    aiResponse
  );
}

/**
 * Generates a conversational response from the companion using LLM
 *
 * Delegates to llm-generator module for focused implementation.
 * Includes streaming support with database batching.
 *
 * @see {import('./activities/llm-generator').generateLLMResponse}
 */
export async function generateLLMResponse(
  companionId: string,
  userMessage: string,
  history: MessageHistory[],
  currentContext: { outfit: string; location: string; action: string },
  isUserPresent: boolean,
  userName: string,
  memories: string[],
  workflowId?: string,
  deepThink?: boolean,
): Promise<string> {
  return await generateResponse(
    companionId,
    userMessage,
    history,
    currentContext,
    isUserPresent,
    userName,
    memories,
    workflowId,
    deepThink,
  );
}

/**
 * Generates a complete Stable Diffusion prompt using a dedicated LLM.
 *
 * Receives all scene context (outfit, location, action, conversation history,
 * companion appearance) and outputs a properly weighted, ordered SD prompt
 * with correct character identity anchoring and action-to-pose translation.
 *
 * @see {import('./activities/sd-prompt-generator').generateSDPrompt}
 */
export async function generateSDPrompt(
  companionId: string,
  outfit: string,
  location: string,
  action: string,
  visualTags: string,
  expression: string,
  lighting: string,
  isUserPresent: boolean,
  userMessage: string,
  aiResponse: string,
  recentHistory: MessageHistory[],
  companionName: string,
  userName: string,
): Promise<SDPromptResult> {
  return await generateSDPromptActivity(
    companionId,
    outfit,
    location,
    action,
    visualTags,
    expression,
    lighting,
    isUserPresent,
    userMessage,
    aiResponse,
    recentHistory,
    companionName,
    userName,
  );
}

/**
 * Generates an image of the companion using Stable Diffusion.
 *
 * Accepts a pre-built SD prompt (positive + negative) produced by generateSDPrompt.
 * The image-generator activity is now a thin wrapper around the SD API call.
 *
 * @see {import('./activities/image-generator').generateCompanionImage}
 */
export async function generateCompanionImage(
  companionId: string,
  positive: string,
  negative: string,
  cfg_scale: number,
  steps: number,
): Promise<string> {
  return await generateImage(
    companionId,
    positive,
    negative,
    cfg_scale,
    steps,
  );
}

/**
 * Extracts and stores memories from a conversation
 *
 * Delegates to memory-extractor module for focused implementation.
 *
 * @see {import('./activities/memory-extractor').extractAndStoreMemories}
 */
export { extractAndStoreMemories };

/**
 * Retrieves relevant memories for a given user message
 *
 * Delegates to memory-retriever module for focused implementation.
 *
 * @see {import('./activities/memory-retriever').retrieveRelevantMemories}
 */
export { retrieveRelevantMemories };

/**
 * Generates voice audio for a companion message using ElevenLabs TTS
 *
 * Delegates to voice-generator module for focused implementation.
 *
 * @see {import('./activities/voice-generator').generateVoiceAudio}
 */
export async function generateVoiceAudio(
  companionId: string,
  voiceId: string,
  text: string
): Promise<{ audioUrl: string | null; error?: string }> {
  return await generateVoice({
    companionId,
    voiceId,
    text,
  });
}

/**
 * Updates the companion's persistent context state in the database.
 * Saves outfit, location, action, and mood after each conversation turn.
 *
 * @param companionId - ID of the companion to update
 * @param outfit - New outfit state
 * @param location - New location state
 * @param action - New action state
 * @param mood - New emotional state
 */
export async function updateCompanionContext(
  companionId: string,
  outfit: string,
  location: string,
  action: string,
  mood: string
) {
  const log = workflowLogger.child({
    activity: 'updateCompanionContext',
    companionId,
  });

  try {
    await prisma.companion.update({
      where: { id: companionId },
      data: {
        currentOutfit: outfit,
        currentLocation: location,
        currentAction: action,
        currentMood: mood,
      }
    });

    log.info({
      outfit,
      location,
      action,
      mood,
    }, 'Companion context updated');

  } catch (e) {
    logError(log, e, {}, 'Failed to update companion context');
    throw e;
  }
}
