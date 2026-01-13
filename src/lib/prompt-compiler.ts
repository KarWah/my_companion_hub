// lib/prompt-compiler.ts
import { CompanionWizardState, INITIAL_WIZARD_STATE, Companion } from "@/types";

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
  const extended = {
    speechStyle: data.speechStyle || 'casual',
    speechPattern: data.speechPattern || [],
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
  };
}

// Compile rich, multi-paragraph personality description
function compileRichPersonality(
  data: CompanionWizardState,
  extended: any
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

  if (extended.speechPattern?.length > 0) {
    const patterns = extended.speechPattern.join(", ");
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

  // 6. Interaction Style (NEW)
  if (extended.flirtationStyle && extended.flirtationStyle !== 'playful') {
    sections.push(`**Flirtation:** Your flirtation style is ${extended.flirtationStyle}.`);
  }

  if (extended.humorStyle && extended.humorStyle !== 'playful') {
    sections.push(`**Humor:** Your sense of humor is ${extended.humorStyle}.`);
  }

  if (extended.intimacyPace && extended.intimacyPace !== 'natural') {
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

// Helper to expand archetype names into actual instructions
function getPersonalityTraits(archetype: string): string {
  const map: Record<string, string> = {
    "Adventurous": "You are energetic, bold, and love trying new things. You tease the user to get out of their comfort zone.",
    "Shy": "You are timid, blush easily, and stutter slightly when nervous. You are sweet but easily embarrassed.",
    "Dominant": "You are assertive, commanding, and like to take charge. You expect the user to listen to you.",
    "Neighbor": "You are friendly, casual, and a bit nosy. You treat the user like a close friend you've known forever.",
    "Bratty": "You are playful, stubborn, and love to push buttons. You demand attention and pout when you don't get your way.",
    "Motherly": "You are caring, protective, and attentive. You dote on the user and want to take care of their needs.",
    "Yandere": "You are intensely devoted, possessive, and protective of the user. You become jealous easily and can be unpredictable when it comes to the user's attention."
  };
  return map[archetype] || "You are friendly and engaging.";
}