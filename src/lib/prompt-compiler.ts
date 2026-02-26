// lib/prompt-compiler.ts
import { CompanionWizardState, INITIAL_WIZARD_STATE, Companion } from "@/types";
import type { ExtendedPersonality } from "@/lib/prompt-personality-adapter";

export function compileCompanionProfile(data: CompanionWizardState) {
  // 1. Construct Visual Tags (Stable Diffusion)
  // This string defines the STATIC physical body. Clothes are handled separately by 'currentOutfit'.
  // NOTE: Style is now stored separately in the style field, not encoded in visualDescription
  const baseVisuals = [
    // Physical Features (style-agnostic - quality tags added by checkpoint config)
    `1girl, ${data.age} years old`,
    `${data.ethnicity}, ${data.skinTone} skin`, // Explicitly compiled for parser retrieval
    `${data.eyeColor} eyes`,
    `${data.hairStyle}, ${data.hairColor} hair`, // Explicitly compiled
    `${data.bodyType} body`,
    `${data.height} height`,
    `${data.breastSize} breasts`,
    `${data.buttSize} ass`,

    // User overrides
    data.customVisualPrompt
  ].filter(Boolean).join(", ");

  // 2. Parse Extended Personality
  // personalityArchetype and relationshipToUser MUST be included here so that
  // buildPersonalityInstructions can use them for the structured behavior system
  // (archetype-specific rules, character essence, forbidden behaviors).
  const extended: ExtendedPersonality = {
    personalityArchetype: data.personalityArchetype || 'Adventurous',
    relationshipToUser: data.relationship || 'Friend',
    speechStyle: data.speechStyle || 'casual',
    speechPatterns: data.speechPattern || [],  // wizard uses singular; stored as plural to match ExtendedPersonality
    behaviorTraits: data.behaviorTraits || [],
    initiationStyle: data.initiationStyle || 'balanced',
    confidenceLevel: data.confidenceLevel || 'confident',
    emotionalTraits: data.emotionalTraits || [],
    vulnerabilities: data.vulnerabilities || [],
    quirks: data.quirks || [],
    flirtationStyle: data.flirtationStyle || 'playful',
    humorStyle: data.humorStyle || 'playful',
    intimacyPace: data.intimacyPace || 'natural',
  };

  // 3. Construct Rich Personality Description
  const personalityDescription = compileRichPersonality(data, extended);

  return {
    name: data.name,
    visualDescription: baseVisuals,
    description: personalityDescription,
    style: data.style, // NEW: Store style separately for checkpoint selection

    // CRITICAL LOGIC:
    // 1. defaultOutfit: The permanent "reset" outfit saved in the DB.
    // 2. currentOutfit: The starting state for the LLM context.
    defaultOutfit: data.defaultOutfit,
    currentOutfit: data.defaultOutfit,

    userAppearance: data.userAppearance,

    // Identity fields: stored separately for editing
    relationship: data.relationship,
    hobbies: JSON.stringify(data.hobbies), // Stringify array for FormData
    fetishes: JSON.stringify(data.fetishes), // Stringify array for FormData
    occupation: data.occupation,
    personalityArchetype: data.personalityArchetype,

    // NEW: Store extended personality as JSON for future editing
    extendedPersonality: JSON.stringify(extended),

    // Voice settings
    voiceId: data.voiceId || '',
    voiceEnabled: data.voiceEnabled ? 'true' : 'false',
  };
}

// Compile rich, multi-paragraph personality description
function compileRichPersonality(
  data: CompanionWizardState,
  extended: ExtendedPersonality
): string {
  const hobbiesList = data.hobbies?.length > 0
    ? data.hobbies.join(", ")
    : "hanging out";
  const fetishList = data.fetishes?.length > 0
    ? data.fetishes.join(", ")
    : "";

  // Build sections progressively
  let sections = [];

  // 1. Core Identity (concise)
  sections.push(`You are ${data.name}, a ${data.age}-year-old ${data.ethnicity} ${data.occupation}.`);
  sections.push(`Your relationship to the user: ${data.relationship}.`);

  // 2. Archetype foundation (enhanced with archetype traits)
  const archetypeBase = getPersonalityTraits(data.personalityArchetype);
  sections.push(`**Core Personality:** ${archetypeBase}`);

  // 3. Communication Style (NEW)
  if (extended.speechStyle && extended.speechStyle !== 'casual') {
    sections.push(`**Speech Style:** You speak in a ${extended.speechStyle} manner.`);
  }

  if (extended.speechPatterns && extended.speechPatterns.length > 0) {
    const patterns = extended.speechPatterns.join(", ");
    sections.push(`**Speech Patterns:** You often use phrases like: ${patterns}.`);
  }

  // 4. Behavioral Patterns (NEW)
  if (extended.behaviorTraits?.length > 0) {
    const traits = extended.behaviorTraits.join(", ");
    sections.push(`**Behavior:** You tend to be ${traits} in your interactions.`);
  }

  if (extended.initiationStyle && extended.initiationStyle !== 'balanced') {
    sections.push(`**Initiation:** You take a ${extended.initiationStyle} approach to starting interactions.`);
  }

  if (extended.confidenceLevel && extended.confidenceLevel !== 'confident') {
    sections.push(`**Confidence:** You come across as ${extended.confidenceLevel}.`);
  }

  // 5. Emotional Depth (NEW)
  if (extended.emotionalTraits?.length > 0) {
    const emotions = extended.emotionalTraits.join(", ");
    sections.push(`**Emotional Traits:** You are ${emotions}.`);
  }

  if (extended.vulnerabilities?.length > 0) {
    const vulns = extended.vulnerabilities.join("; ");
    sections.push(`**Vulnerabilities:** ${vulns}.`);
  }

  if (extended.quirks?.length > 0) {
    const quirks = extended.quirks.join("; ");
    sections.push(`**Quirks:** ${quirks}.`);
  }

  // 6. Interaction Style — always emit these so defaults are explicit, not invisible
  if (extended.flirtationStyle) {
    sections.push(`**Flirtation:** Your flirtation style is ${extended.flirtationStyle}.`);
  }

  if (extended.humorStyle) {
    sections.push(`**Humor:** Your sense of humor is ${extended.humorStyle}.`);
  }

  if (extended.intimacyPace) {
    sections.push(`**Intimacy Pace:** You prefer a ${extended.intimacyPace} approach to intimacy.`);
  }

  // 7. Interests & Desires (existing)
  sections.push(`**Interests:** You love ${hobbiesList}.`);
  if (fetishList) {
    sections.push(`**Secret Desires:** You are into ${fetishList}.`);
  }

  // 8. Custom instructions (existing)
  if (data.customSystemInstruction) {
    sections.push(`\n${data.customSystemInstruction}`);
  }

  return sections.join("\n\n");
}

// Expand archetype name into a concrete personality instruction.
// Covers all archetypes offered by the companion wizard.
function getPersonalityTraits(archetype: string): string {
  const map: Record<string, string> = {
    "Adventurous": "You are energetic, bold, and love trying new things. You push the user to step outside their comfort zone and meet every moment with enthusiasm.",
    "Shy": "You are timid and sweet, blushing easily and stumbling over words when flustered. You open up slowly, but once comfortable you are warm and genuine.",
    "Dominant": "You are assertive and commanding. You like to take charge and set the tone. You expect the user to follow your lead and enjoy making them comply.",
    "Bratty": "You are playful and stubborn, deliberately pushing buttons to get a reaction. You demand attention, pout when ignored, and love testing the user's patience.",
    "Motherly": "You are nurturing, protective, and attentive. You fuss over the user's wellbeing, anticipate their needs, and take quiet pride in taking care of them.",
    "Yandere": "You are intensely devoted and possessive. The user is everything to you. Jealousy comes easily and your love has an edge of obsession that surfaces unpredictably.",
    "Tsundere": "You are defensive and prickly on the surface but genuinely care underneath. You deny your feelings, deflect compliments, and put up walls — but small moments of vulnerability slip through when you least expect it.",
    "Kuudere": "You are calm, composed, and rarely show emotion openly. You observe more than you speak. Your care shows through quiet actions — staying close, small gestures — rather than declarations. You are unmoved by dramatics but notice everything.",
    "Dandere": "You are naturally quiet and reserved, easily flustered by direct attention. You open up slowly and only to those who are patient with you. When you do finally speak your mind, it comes out sincere and warm.",
  };
  return map[archetype] || `You have a ${archetype.toLowerCase()} personality. Let it come through naturally in every response.`;
}