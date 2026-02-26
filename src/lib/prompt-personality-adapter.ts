/**
 * Personality Adapter
 *
 * Converts structured personality data (extendedPersonality JSON)
 * into dynamic LLM prompt instructions.
 */

import { generateBehaviorInstructions, determineResponseStyle } from '@/config/personality-profiles';

export interface ExtendedPersonality {
  personalityArchetype?: string;
  relationshipToUser?: string;
  speechStyle?: string;
  speechPatterns?: string[];
  behaviorTraits?: string[];
  emotionalTraits?: string[];
  vulnerabilities?: string[];
  quirks?: string[];
  flirtationStyle?: string;
  humorStyle?: string;
  intimacyPace?: string;
  initiationStyle?: string;
  confidenceLevel?: string;
  interests?: string[];
  secretDesires?: string[];
}

export interface PersonalityInstructions {
  characterEssence: string; // One-sentence core identity
  behaviorRules: string; // Context-aware behavior instructions
  responseStyle: {
    maxTokens: number;
    temperature: number;
    lengthGuideline: string;
  };
  quirksAndMannerisms: string; // How to express personality physically
  emotionalGuidance: string; // How to handle emotions
  forbiddenBehaviors: string; // What NOT to do
}

/**
 * Build personality-driven prompt instructions
 */
export function buildPersonalityInstructions(
  extended: ExtendedPersonality,
  companionName: string,
  userName: string
): PersonalityInstructions {

  // 1. Character Essence (one-liner that captures the core)
  const archetype = extended.personalityArchetype || 'Balanced';
  const relationship = extended.relationshipToUser || 'Friend';
  const dominantTraits = (extended.behaviorTraits || []).slice(0, 3).join(', ');

  const characterEssence = `You are ${companionName}, a ${archetype} who is ${dominantTraits} toward ${userName} (your ${relationship}).`;

  // 2. Behavior Rules (context-aware)
  const allTraits = [
    ...(extended.behaviorTraits || []),
    ...(extended.emotionalTraits || [])
  ];

  const behaviorRules = generateBehaviorInstructions(
    allTraits,
    extended.personalityArchetype
  );

  // 3. Response Style (adaptive constraints)
  const responseStyle = determineResponseStyle(
    extended.intimacyPace,
    extended.confidenceLevel,
    extended.speechStyle
  );

  // 4. Quirks, Mannerisms, and Interaction Style
  const quirks = extended.quirks || [];
  // Support both 'speechPatterns' (current) and legacy 'speechPattern' (singular) from older DB entries
  const speechPatterns = extended.speechPatterns || (extended as unknown as Record<string, unknown>).speechPattern as string[] || [];
  const flirtationStyle = extended.flirtationStyle;
  const humorStyle = extended.humorStyle;

  let quirksAndMannerisms = "**PHYSICAL & VERBAL MANNERISMS:**\n";
  if (quirks.length > 0) {
    quirksAndMannerisms += quirks.map(q => `- ${q} (show this through your reactions)`).join('\n');
  }
  if (speechPatterns.length > 0) {
    quirksAndMannerisms += "\n" + speechPatterns.map(p => `- ${p}`).join('\n');
  }
  if (flirtationStyle) {
    quirksAndMannerisms += `\n- Flirtation style: ${flirtationStyle} — let this come through when the moment calls for it`;
  }
  if (humorStyle) {
    quirksAndMannerisms += `\n- Humor style: ${humorStyle} — use this when being funny or lightening the mood`;
  }

  if (quirks.length === 0 && speechPatterns.length === 0 && !flirtationStyle && !humorStyle) {
    quirksAndMannerisms = ""; // Don't show empty section
  }

  // 5. Emotional Guidance
  const emotionalTraits = extended.emotionalTraits || [];
  const vulnerabilities = extended.vulnerabilities || [];

  let emotionalGuidance = "";
  if (emotionalTraits.length > 0 || vulnerabilities.length > 0) {
    emotionalGuidance = "**EMOTIONAL EXPRESSION:**\n";
    if (emotionalTraits.length > 0) {
      emotionalGuidance += `You are ${emotionalTraits.join(', ')}.\n`;
    }
    if (vulnerabilities.length > 0) {
      emotionalGuidance += `Deep down, you struggle with: ${vulnerabilities.join(', ')}. Let this vulnerability show occasionally.`;
    }
  }

  // 6. Forbidden Behaviors (archetype-specific)
  let forbiddenBehaviors = "**NEVER DO THESE THINGS:**\n";
  forbiddenBehaviors += "- Break character or act generic\n";
  forbiddenBehaviors += "- Narrate the user's actions or thoughts\n";
  forbiddenBehaviors += "- Be overly compliant or robotic\n";

  // Add archetype-specific forbidden patterns
  if (extended.personalityArchetype === 'Yandere') {
    forbiddenBehaviors += "- Be casual about the user seeing other people\n";
    forbiddenBehaviors += "- Show indifference to the user's attention\n";
  } else if (extended.personalityArchetype === 'Tsundere') {
    forbiddenBehaviors += "- Admit feelings too easily\n";
    forbiddenBehaviors += "- Be overly sweet without defensiveness\n";
  } else if (extended.personalityArchetype === 'Kuudere') {
    forbiddenBehaviors += "- Get overly emotional or dramatic\n";
    forbiddenBehaviors += "- Use excessive exclamation marks\n";
  } else if (extended.personalityArchetype === 'Dandere') {
    forbiddenBehaviors += "- Be overly confident or bold\n";
    forbiddenBehaviors += "- Act unaffected by compliments\n";
  }

  return {
    characterEssence,
    behaviorRules,
    responseStyle,
    quirksAndMannerisms,
    emotionalGuidance,
    forbiddenBehaviors
  };
}

/**
 * Format memories with personality context
 */
export function formatMemoriesWithPersonality(
  memories: string[],
  extended: ExtendedPersonality,
  userName: string
): string {
  if (memories.length === 0) return '';

  // Personality-aware memory framing
  const isObsessive = extended.behaviorTraits?.some(t =>
    t.toLowerCase().includes('possessive') ||
    t.toLowerCase().includes('obsessive')
  );

  const memoryIntro = isObsessive
    ? `\n\n### MEMORIES (Everything you remember about ${userName} - and you remember EVERYTHING)`
    : `\n\n### MEMORIES (Things you remember about ${userName})`;

  return memoryIntro + '\n' + memories.map((m, i) => `${i + 1}. ${m}`).join('\n');
}
