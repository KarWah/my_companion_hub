// lib/prompt-parser.ts
import { CompanionWizardState, INITIAL_WIZARD_STATE, Companion } from "@/types";

export function parseCompanionToWizardState(companion: Companion): CompanionWizardState {
  const vis = companion.visualDescription || "";
  const desc = companion.description || "";

  // Helper regex to find keywords from a list
  const findKey = (text: string, options: string[]) => {
    // Regex logic: looks for whole words, case insensitive
    const found = options.find(opt => new RegExp(`\\b${opt}\\b`, 'i').test(text));
    return found ? found.toLowerCase() : null;
  };

  // 1. Parse Style - read directly from database field (no longer encoded in visualDescription)
  // Fallback to 'anime' if not set (for backwards compatibility with old records)
  const style = companion.style || 'anime';

  // 2. Parse Appearance
  const hairColor = findKey(vis, ['blonde', 'black', 'brown', 'red', 'ginger', 'pink', 'white', 'blue', 'green', 'purple', 'gray']) || 'blonde';
  const eyeColor = findKey(vis, ['blue', 'green', 'brown', 'red', 'purple', 'yellow', 'black', 'white']) || 'blue';

  // Parse ethnicity including fantasy races
  const ethnicity = findKey(vis, ['elf', 'demon', 'catgirl', 'asian', 'white', 'caucasian', 'latina', 'black', 'arab', 'indian']) || 'white';

  // Parse missing fields (Ensure these match your UI options)
  const skinTone = findKey(vis, ['pale', 'fair', 'tan', 'olive', 'dark', 'black', 'blue', 'green']) || 'pale';

  // Parse three-tier hair system (primary + modifiers + texture)
  const hairPrimaryOptions = ['loose', 'ponytail', 'twin-tails', 'twintails', 'bun', 'braids', 'bobcut', 'bob', 'short'];
  const hairModifierOptions = ['parted', 'bangs'];
  const hairTextureOptions = ['straight', 'wavy', 'curly'];

  const words = vis.toLowerCase().split(/[\s,]+/);
  const hairPrimary = hairPrimaryOptions.find(opt => words.includes(opt.replace('-', ' '))) || 'loose';
  const hairModifiers = hairModifierOptions.filter(opt => words.includes(opt));
  const hairTexture = hairTextureOptions.find(opt => words.includes(opt)) || '';

  const hairStyle = [hairPrimary, ...hairModifiers, hairTexture].filter(Boolean).join(' ');

  const height = findKey(vis, ['petite', 'tall', 'short', 'average', 'giantess']) || 'average';

  // 3. Parse Body
  const bodyType = findKey(vis, ['slim', 'athletic', 'curvy', 'chubby', 'muscular']) || 'curvy';
  const breastSize = findKey(vis, ['flat', 'small', 'medium', 'large', 'huge']) || 'large';
  const buttSize = findKey(vis, ['small', 'medium', 'large']) || 'medium';
  
  // Extract Age
  const ageMatch = vis.match(/(\d+)\s*years old/i) || desc.match(/(\d+)[- ]year[- ]old/i);
  const age = ageMatch ? parseInt(ageMatch[1]) : 23;

  // 4. Parse Identity
  // Use database fields directly (no longer parsing from description)
  const occupation = companion.occupation || "Student";
  const relationship = companion.relationship || "Stranger";
  const personalityArchetype = companion.personalityArchetype || "Adventurous";
  const hobbies = companion.hobbies || [];
  const fetishes = companion.fetishes || [];

  // 5. Outfit Logic (CRITICAL)
  // We prefer the 'defaultOutfit' (permanent).
  // If that is missing (legacy records), we fall back to 'currentOutfit'.
  const outfitToEdit = companion.defaultOutfit || companion.currentOutfit || "oversized hoodie";

  // 6. Parse Extended Personality from JSON
  let extended = {
    speechStyle: 'casual',
    speechPattern: [],
    behaviorTraits: [],
    initiationStyle: 'balanced',
    confidenceLevel: 'confident',
    emotionalTraits: [],
    vulnerabilities: [],
    quirks: [],
    flirtationStyle: 'playful',
    humorStyle: 'playful',
    intimacyPace: 'natural',
  };

  if (companion.extendedPersonality) {
    try {
      const parsed = JSON.parse(companion.extendedPersonality);
      extended = { ...extended, ...parsed };
    } catch (e) {
      console.warn('Failed to parse extended personality, using defaults');
    }
  }

  return {
    ...INITIAL_WIZARD_STATE,
    name: companion.name,
    style: style,
    ethnicity,
    skinTone,
    hairColor,
    hairStyle,
    eyeColor,
    bodyType: bodyType as any,
    breastSize: breastSize as any,
    buttSize: buttSize as any,
    age,
    height,
    occupation,
    relationship,
    hobbies,
    fetishes,
    personalityArchetype,
    defaultOutfit: outfitToEdit,
    userAppearance: companion.userAppearance || "",

    // Extended personality fields
    ...extended,
  };
}