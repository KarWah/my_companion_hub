import type { MessageHistory, ContextAnalysis, ContextAnalysisResponse } from '@/types';
import { workflowLogger, startTimer, logError } from '@/lib/logger';
import { env } from '@/lib/env';
import { buildContextAnalysisPrompt } from '@/config/prompts/context-analysis';
import { extractJSON, cleanTagString } from './helpers/json-parser';

/**
 * Analyzes conversation context to extract visual state for image generation
 *
 * This function uses an LLM to analyze the conversation and determine:
 * - Current outfit (what the companion is wearing)
 * - Current location (where they are)
 * - Current action (what they're doing)
 * - Visual tags (pose, camera angle, scene details)
 * - User presence (whether user is physically present)
 * - Expression (facial expression)
 * - Lighting (scene lighting)
 *
 * @param currentOutfit - Previous outfit state
 * @param currentLocation - Previous location state
 * @param currentAction - Previous action state
 * @param userMessage - User's latest message
 * @param history - Recent message history
 * @param companionName - Name of the companion
 * @param userName - Name of the user
 * @param aiResponse - Companion's response to analyze
 * @returns Updated context analysis with visual state
 */
export async function analyzeConversationContext(
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  userMessage: string,
  history: MessageHistory[],
  companionName: string,
  userName: string,
  aiResponse: string
): Promise<ContextAnalysis> {
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'analyzeContext',
    companionName,
  });

  // Map history to explicit names to prevent 'Subject Confusion'
  const recentHistory = history.slice(-4).map(m => {
    const speaker = m.role === "user" ? `User (${userName})` : `Companion (${companionName})`;
    return `${speaker}: ${m.content}`;
  }).join("\n");

  // Build system prompt using centralized prompt builder
  const systemPrompt = buildContextAnalysisPrompt(
    companionName,
    userName,
    currentOutfit,
    currentAction,
    currentLocation
  );

  log.debug({ historyLength: history.length }, 'Starting context analysis');

  try {
    const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.NOVITA_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sao10k/l31-70b-euryale-v2.2",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `CONTEXT HISTORY:\n${recentHistory}\n\nLATEST INPUT from ${userName}: "${userMessage}"\n\nLATEST AI RESPONSE (${companionName}): "${aiResponse}"`
          }
        ],
        max_tokens: 600,
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'Context analysis API error');
      throw new Error(`Novita API error: ${errorText}`);
    }

    const data = await response.json();

    // Parse JSON response using aggressive extractor
    const parsed = extractJSON(data.choices[0].message.content) as unknown as ContextAnalysisResponse;

    // If parsing failed completely, keep old state
    if ((parsed as any)._failed) {
      log.warn({ duration: timer() }, "Keeping previous state due to parse failure");
      return {
        outfit: currentOutfit,
        location: currentLocation,
        action: currentAction,
        visualTags: "",
        isUserPresent: false,
        expression: "neutral",
        lighting: "cinematic lighting"
      };
    }

    // Update action logic: prefer parsed action, fallback to current if empty
    const newAction = parsed.action_summary && parsed.action_summary.length > 0
      ? parsed.action_summary
      : currentAction;

    // Update outfit logic: clean and validate outfit changes
    let newOutfit = cleanTagString(parsed.outfit);
    // If the model gets lazy and says "casual" or "unknown", keep the old one
    if (!newOutfit || newOutfit.match(/no specified|unknown|clothing|casual|n\/a/i)) {
      newOutfit = currentOutfit;
    }

    const result: ContextAnalysis = {
      outfit: newOutfit,
      location: cleanTagString(parsed.location) || currentLocation,
      action: newAction,
      visualTags: cleanTagString(parsed.visual_tags),
      isUserPresent: !!parsed.is_user_present,
      expression: cleanTagString(parsed.expression) || "neutral",
      lighting: cleanTagString(parsed.lighting) || "cinematic lighting"
    };

    log.info({
      duration: timer(),
      outfitChanged: result.outfit !== currentOutfit,
      locationChanged: result.location !== currentLocation,
      isUserPresent: result.isUserPresent,
    }, 'Context analysis completed');

    return result;

  } catch (e) {
    logError(log, e, { duration: timer() }, 'Context analysis failed');

    // Return fallback state
    return {
      outfit: currentOutfit,
      location: currentLocation,
      action: currentAction,
      visualTags: "",
      isUserPresent: false,
      expression: "neutral",
      lighting: "cinematic lighting"
    };
  }
}
