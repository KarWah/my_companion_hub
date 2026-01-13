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
  workflowId?: string
): Promise<string> {
  return await generateResponse(
    companionId,
    userMessage,
    history,
    currentContext,
    isUserPresent,
    userName,
    workflowId
  );
}

/**
 * Generates an image of the companion using Stable Diffusion
 *
 * Delegates to image-generator module for focused implementation.
 * Includes automatic checkpoint selection based on companion.style.
 *
 * @see {import('./activities/image-generator').generateCompanionImage}
 */
export async function generateCompanionImage(
  companionId: string,
  visualState: string,
  location: string,
  visualTags: string,
  expression: string,
  isUserPresent: boolean,
  lighting: string,
): Promise<string> {
  return await generateImage(
    companionId,
    visualState,
    location,
    visualTags,
    expression,
    isUserPresent,
    lighting
  );
}

/**
 * Updates the companion's persistent context state in the database
 *
 * This function is already small and focused, so it remains in this file.
 * Updates outfit, location, and action for the companion.
 *
 * @param companionId - ID of the companion to update
 * @param outfit - New outfit state
 * @param location - New location state
 * @param action - New action state
 */
export async function updateCompanionContext(
  companionId: string,
  outfit: string,
  location: string,
  action: string
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
        currentAction: action
      }
    });

    log.info({
      outfit,
      location,
      action,
    }, 'Companion context updated');

  } catch (e) {
    logError(log, e, {}, 'Failed to update companion context');
    throw e;
  }
}
