import { workflowLogger, startTimer, logError } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import type { MessageHistory } from '@/types';
import { buildSDPromptSystemPrompt } from '@/config/prompts/sd-prompt-generator';
import { getCheckpointForStyle } from '@/config/checkpoints';
import { extractJSON } from './helpers/json-parser';
import { filterOutfitForLayering } from './helpers/outfit-filter';
import { IMAGE_GENERATION_CONFIG } from '@/config/prompts/image-generation';

export interface SDPromptResult {
  positive: string;
  negative: string;
  cfg_scale: number;
  steps: number;
}

/**
 * Generates a complete Stable Diffusion prompt using an LLM.
 *
 * Unlike the old `buildImagePrompt` helper, this function feeds ALL scene
 * context — including the full conversation exchange, companion appearance,
 * current outfit, action, and environment — to a dedicated LLM that
 * understands SD syntax and constructs a properly weighted, ordered prompt.
 *
 * The character's visual appearance (hair, eyes, skin, body) is passed as
 * a locked identity anchor, preventing it from drifting between images.
 * The action field is explicitly translated into SD pose tags.
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
  const log = workflowLogger.child({ activity: 'generateSDPrompt', companionId });
  const timer = startTimer();

  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: {
      style: true,
      defaultOutfit: true,
      visualDescription: true,
      userAppearance: true,
      occupation: true,
      fetishes: true,
    }
  });

  if (!companion) throw new Error('Companion not found');

  const checkpoint = getCheckpointForStyle(companion.style);
  const loraTag = checkpoint.lora
    ? `<lora:${checkpoint.lora.name}:${checkpoint.lora.weight}> inuk, uncensored`
    : '';

  // Apply layering filter before the LLM sees the outfit:
  // if outerwear is present (jacket, hoodie, coat), strip underwear tags so the
  // LLM doesn't include them in the prompt and SD doesn't hallucinate them visible.
  const { filteredOutfit, isNude } = filterOutfitForLayering(outfit, visualTags, location);
  const currentOutfit = isNude
    ? ''
    : (filteredOutfit || companion.defaultOutfit || 'casual clothes');

  // Format recent history with speaker names for context
  const historyText = recentHistory.slice(-6).map(m => {
    const speaker = m.role === 'user' ? userName : companionName;
    return `${speaker}: ${m.content}`;
  }).join('\n');

  const userPresenceNote = isUserPresent
    ? `USER IS PHYSICALLY PRESENT in the scene. User's appearance: ${companion.userAppearance || 'not specified'}`
    : 'User is NOT physically present (remote/text conversation only)';

  // Cast to string[] directly if it's already stored as a JSON array in Prisma
  const fetishesList = (companion.fetishes as string[]) || [];
  const characterContext = [
    companion.occupation && `Occupation: ${companion.occupation}`,
    fetishesList.length > 0 && `Fetishes/kinks (may inform scene tone): ${fetishesList.join(', ')}`,
  ].filter(Boolean).join(' | ');

  const userContent = `CHARACTER: ${companionName}
CHARACTER APPEARANCE (locked identity — preserve exactly): ${companion.visualDescription}
${characterContext ? `CHARACTER CONTEXT: ${characterContext}` : ''}
${loraTag ? `LORA TAG (include verbatim): ${loraTag}` : ''}
ART STYLE: ${companion.style}

CURRENT SCENE STATE:
- Outfit: ${isNude ? 'NUDE — character is unclothed' : currentOutfit}${!isNude ? '\n  ⚠ CANONICAL TRUTH: Use this outfit list EXACTLY. Do not add, remove, or infer clothing from the conversation.' : ''}
- Location: ${location}
- Action (what ${companionName} is doing RIGHT NOW): ${action}
- Expression: ${expression}
- Lighting: ${lighting}
- ${userPresenceNote}
${visualTags ? `- Additional visual context/pose hints: ${visualTags}` : ''}

CONVERSATION CONTEXT (for understanding the full scene):
${historyText || '(no prior history)'}

LATEST EXCHANGE:
${userName}: ${userMessage}
${companionName}: ${aiResponse}

Generate a complete SD prompt capturing this exact scene. The character's appearance must be preserved faithfully. Translate the action into precise SD pose tags.`;

  const systemPrompt = buildSDPromptSystemPrompt(companion.style);

  try {
    const response = await fetch('https://api.novita.ai/v3/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOVITA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sao10k/l31-70b-euryale-v2.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 900,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Novita API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content as string;

    const parsed = extractJSON(content) as unknown as { positive?: string; negative?: string; _failed?: boolean };

    if ((parsed as any)._failed || !parsed.positive || !parsed.negative) {
      log.warn({ duration: timer() }, 'SD prompt LLM returned invalid JSON — using fallback');
      return buildFallbackPrompt(
        companion.style,
        companion.visualDescription,
        currentOutfit,
        location,
        action,
        expression,
        lighting,
        isUserPresent,
        isNude,
        loraTag,
        checkpoint.cfg_scale,
        checkpoint.steps,
      );
    }

    log.info({ duration: timer(), positiveLength: parsed.positive.length }, 'SD prompt generated by LLM');

    return {
      positive: parsed.positive,
      negative: parsed.negative,
      cfg_scale: checkpoint.cfg_scale,
      steps: checkpoint.steps,
    };

  } catch (e) {
    logError(log, e, { duration: timer() }, 'SD prompt generation failed — using fallback');
    return buildFallbackPrompt(
      companion.style,
      companion.visualDescription,
      currentOutfit,
      location,
      action,
      expression,
      lighting,
      isUserPresent,
      isNude,
      loraTag,
      checkpoint.cfg_scale,
      checkpoint.steps,
    );
  }
}

/**
 * Fallback prompt builder used when the LLM call fails or returns invalid JSON.
 * Produces a structured SD prompt using the old weighted tag approach.
 */
function buildFallbackPrompt(
  style: 'anime' | 'realistic',
  visualDescription: string,
  outfit: string,   // already layering-filtered before this is called
  location: string,
  action: string,
  expression: string,
  lighting: string,
  isUserPresent: boolean,
  isNude: boolean,
  loraTag: string,
  cfg_scale: number,
  steps: number,
): SDPromptResult {
  const qualityTags = style === 'anime'
    ? '(masterpiece, best quality:1.2), absurdres, highres, anime style, vibrant colors, uncensored'
    : '(photorealistic:1.3), raw photo, 8k uhd, dslr, soft lighting, high quality, film grain';

  const characterTags = isUserPresent
    ? '(1girl, 1boy, hetero), couple focus'
    : '(1girl, solo)';

  const parts = [
    qualityTags,
    loraTag,
    characterTags,
    `(${visualDescription}:1.15)`,
    isNude ? 'nude, naked, bare skin' : outfit,
    action,
    expression ? `(${expression})` : '',
    location ? `(${location})` : '',
    lighting,
  ].filter(p => p && p.trim() !== '');

  const positive = parts.join(', ').replace(/\s+/g, ' ').trim();

  const baseNegative = `${IMAGE_GENERATION_CONFIG.BASE_NEGATIVE}, ${style === 'anime' ? 'realistic, photorealistic' : 'anime, cartoon, illustration'}`;
  const sceneNegative = isUserPresent
    ? IMAGE_GENERATION_CONFIG.COUPLE_NEGATIVE_ADDITIONS
    : IMAGE_GENERATION_CONFIG.SOLO_NEGATIVE_ADDITIONS;
  const nudeNegative = isNude ? IMAGE_GENERATION_CONFIG.NUDE_NEGATIVE_ADDITIONS : '';

  const negative = [baseNegative, sceneNegative, nudeNegative].filter(Boolean).join(', ');

  return { positive, negative, cfg_scale, steps };
}
