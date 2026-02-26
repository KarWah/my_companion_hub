import type { MessageHistory } from '@/types';
import { workflowLogger, startTimer } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import { buildLLMSystemPrompt } from '@/config/prompts/llm-response';
import { determineResponseStyle } from '@/config/personality-profiles';
import { LLM_CHAT_CONFIG } from '@/config/generation';
import { publishWorkflowDelta } from '@/lib/redis';

/**
 * Generates a conversational response from the companion using LLM
 *
 * This function:
 * 1. Fetches companion data and personality
 * 2. Builds a system prompt with current context (outfit, location, action)
 * 3. Includes relevant memories in the prompt
 * 4. Streams the LLM response token-by-token
 * 5. Batches database writes for smooth streaming display
 * 6. Cleans up the response (removes action markers, scene tags)
 *
 * @param companionId - ID of the companion
 * @param userMessage - User's message to respond to
 * @param history - Recent conversation history
 * @param currentContext - Current visual context (outfit, location, action)
 * @param isUserPresent - Whether user is physically present
 * @param userName - Name of the user
 * @param memories - Array of relevant memory strings to include in context
 * @param workflowId - Optional workflow ID for streaming updates to database
 * @returns Cleaned conversational response from companion
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
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'generateLLMResponse',
    companionId,
    workflowId,
  });

  log.info({
    messageLength: userMessage.length,
    historyLength: history.length,
  }, 'Starting LLM response generation');

  // Fetch companion data
  // Note: currentMood/affectionLevel/trustLevel added to schema — remove `as any` after `prisma generate`
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: {
      name: true,
      description: true,
      userAppearance: true,
      extendedPersonality: true,
      currentMood: true,
      affectionLevel: true,
      trustLevel: true,
    } as any
  }) as {
    name: string;
    description: string;
    userAppearance: string | null;
    extendedPersonality: string | null;
    currentMood: string;
    affectionLevel: number;
    trustLevel: number;
  } | null;

  if (!companion) {
    log.error('Companion not found');
    throw new Error("Companion not found");
  }

  // Parse extended personality JSON
  let extendedPersonality = null;
  if (companion.extendedPersonality) {
    try {
      extendedPersonality = JSON.parse(companion.extendedPersonality);
    } catch (error) {
      log.warn({ error }, 'Failed to parse extendedPersonality JSON');
    }
  }

  // Clean history for API — strip asterisk actions from previous assistant messages
  // so the model sees clean format examples rather than reinforcing the *action* pattern
  const cleanHistory = history.map(h => ({
    role: h.role,
    content: h.role === 'assistant'
      ? h.content.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim()
      : h.content
  }));

  // Build system prompt using centralized prompt builder (with memories and personality)
  const systemPrompt = buildLLMSystemPrompt(
    companion.name,
    companion.description,
    userName,
    currentContext.action,
    currentContext.outfit,
    currentContext.location,
    memories,
    extendedPersonality,
    companion.userAppearance || undefined,
    isUserPresent,
    companion.currentMood || 'neutral',
    companion.affectionLevel ?? 50,
    companion.trustLevel ?? 50,
  );

  // Determine response style based on personality (dynamic max_tokens and temperature)
  const responseStyle = extendedPersonality
    ? determineResponseStyle(
        extendedPersonality.intimacyPace,
        extendedPersonality.confidenceLevel,
        extendedPersonality.speechStyle
      )
    : { maxTokens: LLM_CHAT_CONFIG.maxTokens, temperature: LLM_CHAT_CONFIG.temperature };

  // DeepThink mode: longer, more deliberate responses at lower temperature
  if (deepThink) {
    responseStyle.maxTokens = 400;
    responseStyle.temperature = 0.7;
  }

  log.debug({
    maxTokens: responseStyle.maxTokens,
    temperature: responseStyle.temperature,
    hasExtendedPersonality: !!extendedPersonality
  }, 'Using personality-driven response style');

  // Call Novita API with streaming enabled
  const response = await fetch(env.NOVITA_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOVITA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.NOVITA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanHistory,
        { role: "user", content: userMessage }
      ],
      max_tokens: responseStyle.maxTokens, // Dynamic based on personality
      temperature: responseStyle.temperature, // Dynamic based on personality
      top_p: LLM_CHAT_CONFIG.topP,
      frequency_penalty: 0.4, // Penalises repeated tokens proportionally — reduces looping phrases
      presence_penalty: 0.2,  // Flat penalty for any already-used token — encourages variety
      stream: true // Enable streaming for token-by-token responses
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error({ status: response.status, errorText }, 'LLM API error');
    throw new Error(`Novita API error: ${errorText}`);
  }

  // Process streaming response
  let fullText = "";
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let tokenBuffer = "";
  let lastDbWrite = Date.now();
  const DB_WRITE_INTERVAL = 100; // Write to DB every 100ms for smooth streaming
  let tokenCount = 0;
  let lineBuffer = ""; // Buffer for incomplete SSE lines across reads
  const streamStartTime = Date.now();
  let lastPublishedSafeLength = 0; // Track how much safe text has been published to Redis

  // Character-level state machine for safe streaming (filters action markers before DB writes)
  // Asterisk actions (*like this*) are intentionally passed through unchanged —
  // filtering them here caused a mismatch where they'd pop in at stream completion.
  let smInParenAction = false;
  let smPendingParenChars = '';
  let smInBracketOpen = false;
  let smBracketBuffer = '';
  let smInSceneBlock = false;
  let safeStreamText = '';

  function processTokenChars(token: string): void {
    for (const char of token) {
      if (smInSceneBlock) {
        if (char === '[') {
          smInBracketOpen = true;
          smBracketBuffer = '[';
        } else if (smInBracketOpen) {
          smBracketBuffer += char;
          if (smBracketBuffer.endsWith(']')) {
            if (/\[\/(?:SCENE|STATE)/i.test(smBracketBuffer)) {
              smInSceneBlock = false;
            }
            smInBracketOpen = false;
            smBracketBuffer = '';
          }
        }
        // else: skip char (inside scene block)
      } else if (smInParenAction) {
        if (char === ')') {
          smInParenAction = false;
          smPendingParenChars = ''; // Discard action
        } else if (/[a-z\s]/.test(char)) {
          smPendingParenChars += char;
        } else {
          // Not an action marker — flush buffered content as normal text
          safeStreamText += '(' + smPendingParenChars + char;
          smPendingParenChars = '';
          smInParenAction = false;
        }
      } else if (smInBracketOpen) {
        smBracketBuffer += char;
        if (smBracketBuffer.endsWith(']')) {
          if (/\[.*?(?:SCENE|STATE)/i.test(smBracketBuffer)) {
            smInSceneBlock = true; // Enter block-skip mode
          } else {
            safeStreamText += smBracketBuffer; // Regular brackets — flush
          }
          smInBracketOpen = false;
          smBracketBuffer = '';
        }
      } else {
        // Normal mode
        if (char === '(') {
          smInParenAction = true;
          smPendingParenChars = '';
        } else if (char === '[') {
          smInBracketOpen = true;
          smBracketBuffer = '[';
        } else {
          safeStreamText += char;
        }
      }
    }
  }

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Use stream: true to preserve incomplete multi-byte sequences
      const chunk = decoder.decode(value, { stream: true });

      // Add to line buffer (previous incomplete line + new chunk)
      lineBuffer += chunk;

      // Split into lines, but keep the last incomplete line in buffer
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ""; // Keep the last (potentially incomplete) line

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.delta?.content || '';
            if (token) {
              tokenCount++;
              if (tokenCount === 1) {
                const ttft = Date.now() - streamStartTime; // Time To First Token
                log.debug({
                  token,
                  ttft,
                }, 'First token received');
              }
              fullText += token;
              tokenBuffer += token;
              processTokenChars(token);

              // Batch write tokens to database for streaming (write safe text, not raw)
              const now = Date.now();
              if (workflowId && (now - lastDbWrite > DB_WRITE_INTERVAL || tokenBuffer.length > 50)) {
                try {
                  await prisma.workflowExecution.update({
                    where: { workflowId },
                    data: { streamedText: safeStreamText }
                  });
                  lastDbWrite = now;
                  tokenBuffer = "";

                  // Publish delta to Redis for real-time SSE delivery
                  const delta = safeStreamText.slice(lastPublishedSafeLength);
                  if (delta) {
                    lastPublishedSafeLength = safeStreamText.length;
                    publishWorkflowDelta(workflowId, delta).catch(redisErr => {
                      log.debug({ error: redisErr }, 'Redis publish failed (SSE will fall back to DB polling)');
                    });
                  }
                } catch (dbError) {
                  log.error({ error: dbError }, "Failed to write streaming tokens to DB");
                  // Continue even if DB write fails
                }
              }
            }
          } catch (e) {
            log.trace({ line: trimmedLine.substring(0, 100) }, "Failed to parse SSE line");
          }
        }
      }
    }

    // Flush the decoder at the end
    const finalChunk = decoder.decode();
    if (finalChunk) {
      lineBuffer += finalChunk;
    }
  }

  // Final DB write with any remaining tokens (write safe text)
  if (workflowId && tokenBuffer) {
    try {
      await prisma.workflowExecution.update({
        where: { workflowId },
        data: { streamedText: safeStreamText }
      });

      // Publish any remaining delta to Redis
      const finalDelta = safeStreamText.slice(lastPublishedSafeLength);
      if (finalDelta) {
        publishWorkflowDelta(workflowId, finalDelta).catch(() => {});
      }
    } catch (dbError) {
      log.error({ error: dbError }, "Failed to write final streaming tokens to DB");
    }
  }

  // Clean up text - remove action markers but keep the actual speech
  const originalLength = fullText.length;

  // Remove scene/state tags if present
  fullText = fullText.replace(/\[.*?(SCENE|STATE).*?\][\s\S]*?\[\/.*?(SCENE|STATE).*?\]/gi, "");

  // Remove parenthetical actions like (giggles), (smiles) - only lowercase
  fullText = fullText.replace(/\s*\([a-z\s]+\)\s*/gi, " ");

  // Remove asterisk actions like *blushes*, *smiles slowly* — enforce no-asterisk format at output layer
  fullText = fullText.replace(/\*[^*]+\*/g, "");

  // Clean up extra whitespace
  fullText = fullText.replace(/\s+/g, " ").trim();

  log.info({
    duration: timer(),
    tokenCount,
    originalLength,
    cleanedLength: fullText.length,
  }, 'LLM response generation completed');

  return fullText;
}
