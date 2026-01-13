import type { MessageHistory } from '@/types';
import { workflowLogger, startTimer } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import { buildLLMSystemPrompt } from '@/config/prompts/llm-response';

/**
 * Generates a conversational response from the companion using LLM
 *
 * This function:
 * 1. Fetches companion data and personality
 * 2. Builds a system prompt with current context (outfit, location, action)
 * 3. Streams the LLM response token-by-token
 * 4. Batches database writes for smooth streaming display
 * 5. Cleans up the response (removes action markers, scene tags)
 *
 * @param companionId - ID of the companion
 * @param userMessage - User's message to respond to
 * @param history - Recent conversation history
 * @param currentContext - Current visual context (outfit, location, action)
 * @param isUserPresent - Whether user is physically present
 * @param userName - Name of the user
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
  workflowId?: string
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
  const companion = await prisma.companion.findUnique({
    where: { id: companionId }
  });

  if (!companion) {
    log.error('Companion not found');
    throw new Error("Companion not found");
  }

  // Clean history for API (remove unnecessary fields)
  const cleanHistory = history.map(h => ({ role: h.role, content: h.content }));

  // Build system prompt using centralized prompt builder
  const systemPrompt = buildLLMSystemPrompt(
    companion.name,
    companion.description,
    userName,
    currentContext.action,
    currentContext.outfit,
    currentContext.location,
    companion.userAppearance || undefined,
    isUserPresent
  );

  // Call Novita API with streaming enabled
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
        ...cleanHistory,
        { role: "user", content: userMessage }
      ],
      max_tokens: 200,
      temperature: 0.9,
      top_p: 0.9,
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

              // Batch write tokens to database for streaming
              const now = Date.now();
              if (workflowId && (now - lastDbWrite > DB_WRITE_INTERVAL || tokenBuffer.length > 50)) {
                try {
                  await prisma.workflowExecution.update({
                    where: { workflowId },
                    data: { streamedText: fullText }
                  });
                  lastDbWrite = now;
                  tokenBuffer = "";
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

  // Final DB write with any remaining tokens
  if (workflowId && tokenBuffer) {
    try {
      await prisma.workflowExecution.update({
        where: { workflowId },
        data: { streamedText: fullText }
      });
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
