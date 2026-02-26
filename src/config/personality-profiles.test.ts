/**
 * Personality Profiles Tests
 *
 * Tests for archetype completeness, behavior rule generation,
 * and response style determination.
 */

import { describe, it, expect } from 'vitest';
import {
  PERSONALITY_ARCHETYPES,
  TRAIT_DEFINITIONS,
  generateBehaviorInstructions,
  determineResponseStyle,
} from './personality-profiles';

const EXPECTED_ARCHETYPES = [
  'Adventurous', 'Shy', 'Dominant', 'Bratty', 'Motherly',
  'Yandere', 'Tsundere', 'Kuudere', 'Dandere',
];

describe('PERSONALITY_ARCHETYPES', () => {
  it('should define all 9 expected archetypes', () => {
    for (const archetype of EXPECTED_ARCHETYPES) {
      expect(PERSONALITY_ARCHETYPES).toHaveProperty(archetype);
    }
  });

  it('each archetype should have required fields', () => {
    for (const archetype of EXPECTED_ARCHETYPES) {
      const profile = PERSONALITY_ARCHETYPES[archetype];
      expect(profile.dominantTraits, `${archetype}.dominantTraits`).toBeDefined();
      expect(profile.dominantTraits!.length, `${archetype} should have at least 1 dominant trait`).toBeGreaterThan(0);
      expect(profile.behaviorRules, `${archetype}.behaviorRules`).toBeDefined();
      expect(profile.behaviorRules!.length, `${archetype} should have at least 1 behavior rule`).toBeGreaterThan(0);
      expect(profile.responseStyle, `${archetype}.responseStyle`).toBeDefined();
      expect(profile.emphasizedPatterns, `${archetype}.emphasizedPatterns`).toBeDefined();
      expect(profile.forbiddenPatterns, `${archetype}.forbiddenPatterns`).toBeDefined();
    }
  });

  it('each behavior rule should have context, behavior, and examples', () => {
    for (const [name, profile] of Object.entries(PERSONALITY_ARCHETYPES)) {
      for (const rule of profile.behaviorRules || []) {
        expect(rule.context, `${name} rule.context`).toBeTruthy();
        expect(rule.behavior, `${name} rule.behavior`).toBeTruthy();
        expect(rule.examples, `${name} rule.examples`).toBeDefined();
        expect(rule.examples.length, `${name} should have at least 1 example`).toBeGreaterThan(0);
      }
    }
  });

  it('each archetype should have a valid responseStyle with all fields', () => {
    const validLengths = ['very_short', 'short', 'moderate', 'verbose'];
    const validIntensities = ['low', 'moderate', 'high', 'extreme'];
    const validDirectness = ['subtle', 'balanced', 'direct', 'blunt'];

    for (const [name, profile] of Object.entries(PERSONALITY_ARCHETYPES)) {
      const style = profile.responseStyle!;
      expect(validLengths, `${name}.lengthPreference invalid`).toContain(style.lengthPreference);
      expect(validIntensities, `${name}.emotionalIntensity invalid`).toContain(style.emotionalIntensity);
      expect(validDirectness, `${name}.directness invalid`).toContain(style.directness);
    }
  });

  it('Dominant archetype should have commanding traits', () => {
    const dominant = PERSONALITY_ARCHETYPES['Dominant'];
    expect(dominant.dominantTraits).toContain('commanding');
    expect(dominant.responseStyle!.directness).toBe('blunt');
    expect(dominant.forbiddenPatterns!.some(p => /permission|uncertainty/i.test(p))).toBe(true);
  });

  it('Shy archetype should have short, subtle response style', () => {
    const shy = PERSONALITY_ARCHETYPES['Shy'];
    expect(shy.responseStyle!.lengthPreference).toBe('short');
    expect(shy.responseStyle!.directness).toBe('subtle');
  });

  it('Kuudere archetype should have very_short, low-intensity style', () => {
    const kuudere = PERSONALITY_ARCHETYPES['Kuudere'];
    expect(kuudere.responseStyle!.lengthPreference).toBe('very_short');
    expect(kuudere.responseStyle!.emotionalIntensity).toBe('low');
  });

  it('Yandere archetype should have extreme emotional intensity', () => {
    const yandere = PERSONALITY_ARCHETYPES['Yandere'];
    expect(yandere.responseStyle!.emotionalIntensity).toBe('extreme');
  });
});

describe('TRAIT_DEFINITIONS', () => {
  it('should include key traits', () => {
    const expectedTraits = ['possessive', 'playful', 'teasing', 'affectionate', 'protective', 'flirty', 'shy', 'confident', 'jealous', 'caring'];
    for (const trait of expectedTraits) {
      expect(TRAIT_DEFINITIONS, `Missing trait: ${trait}`).toHaveProperty(trait);
    }
  });

  it('each trait definition should have required fields', () => {
    for (const [name, def] of Object.entries(TRAIT_DEFINITIONS)) {
      expect(def.trait, `${name}.trait`).toBe(name);
      expect(def.weight, `${name}.weight`).toBeGreaterThanOrEqual(1);
      expect(def.weight, `${name}.weight`).toBeLessThanOrEqual(10);
      expect(def.triggers, `${name}.triggers`).toBeDefined();
      expect(def.manifestations, `${name}.manifestations`).toBeDefined();
      expect(def.manifestations.length, `${name} should have manifestations`).toBeGreaterThan(0);
    }
  });
});

describe('generateBehaviorInstructions', () => {
  it('should return archetype behavior rules when archetype provided', () => {
    const result = generateBehaviorInstructions([], 'Dominant');

    expect(result).toContain('PERSONALITY-DRIVEN BEHAVIOR RULES');
    expect(result).toContain('ALWAYS DO');
    expect(result).toContain('NEVER DO');
  });

  it('should include Dominant archetype rules', () => {
    const result = generateBehaviorInstructions([], 'Dominant');

    expect(result).toContain('Ask for permission');
    expect(result).toContain('Speak in declaratives');
  });

  it('should include trait manifestations when traits provided', () => {
    const result = generateBehaviorInstructions(['possessive', 'jealous'], undefined);

    expect(result).toContain('TRAIT MANIFESTATIONS');
    expect(result).toContain('possessive');
    expect(result).toContain('jealous');
  });

  it('should sort traits by weight descending', () => {
    const result = generateBehaviorInstructions(['playful', 'protective'], undefined);

    // 'protective' has weight 8, 'playful' has weight 6 — protective should appear first
    const protectiveIndex = result.indexOf('protective');
    const playfulIndex = result.indexOf('playful');

    expect(protectiveIndex).toBeGreaterThan(-1);
    expect(playfulIndex).toBeGreaterThan(-1);
    expect(protectiveIndex).toBeLessThan(playfulIndex);
  });

  it('should skip unknown traits gracefully', () => {
    const result = generateBehaviorInstructions(['nonexistent_trait', 'playful'], undefined);

    // Should not include unknown trait
    expect(result).not.toContain('nonexistent_trait');
    expect(result).toContain('playful');
  });

  it('should limit to top 5 traits', () => {
    const manyTraits = ['possessive', 'playful', 'teasing', 'affectionate', 'protective', 'flirty', 'shy', 'confident', 'jealous', 'caring'];
    const result = generateBehaviorInstructions(manyTraits, undefined);

    // Should cap at 5 — we can check that output includes exactly 5 trait blocks
    const traitMatches = result.match(/\*\*[a-z_]+\*\* \(\d+\/10 intensity\)/g);
    expect(traitMatches?.length).toBe(5);
  });

  it('should return empty string when no archetype or valid traits', () => {
    const result = generateBehaviorInstructions([], undefined);
    expect(result.trim()).toBe('');
  });

  it('should combine archetype rules and trait manifestations', () => {
    const result = generateBehaviorInstructions(['possessive'], 'Yandere');

    expect(result).toContain('PERSONALITY-DRIVEN BEHAVIOR RULES');
    expect(result).toContain('TRAIT MANIFESTATIONS');
    expect(result).toContain('possessive');
  });
});

describe('determineResponseStyle', () => {
  it('should return defaults when no parameters provided', () => {
    const result = determineResponseStyle();

    expect(result.maxTokens).toBe(200);
    expect(result.temperature).toBe(0.9);
    expect(result.lengthGuideline).toContain('SHORT');
  });

  it('should increase maxTokens for Verbose speech style', () => {
    const result = determineResponseStyle(undefined, undefined, 'Verbose');

    expect(result.maxTokens).toBeGreaterThan(200);
    expect(result.lengthGuideline).toContain('expressive');
  });

  it('should decrease maxTokens for Blunt speech style', () => {
    const result = determineResponseStyle(undefined, undefined, 'Blunt');

    expect(result.maxTokens).toBeLessThan(200);
    expect(result.lengthGuideline).toContain('brief');
  });

  it('should increase temperature for Eager intimacy pace', () => {
    const result = determineResponseStyle('Eager');

    expect(result.temperature).toBeGreaterThan(0.9);
  });

  it('should decrease temperature for Slow Burn intimacy pace', () => {
    const result = determineResponseStyle('Slow Burn');

    expect(result.temperature).toBeLessThan(0.9);
  });

  it('should cap maxTokens for Very Shy confidence level', () => {
    const result = determineResponseStyle(undefined, 'Very Shy');

    expect(result.maxTokens).toBeLessThanOrEqual(150);
  });

  it('should ensure minimum maxTokens for Confident level', () => {
    const result = determineResponseStyle(undefined, 'Confident');

    expect(result.maxTokens).toBeGreaterThanOrEqual(200);
  });

  it('should handle Poetic speech style same as Verbose', () => {
    const result = determineResponseStyle(undefined, undefined, 'Poetic');

    expect(result.maxTokens).toBeGreaterThan(200);
  });

  it('should handle Casual speech style same as Blunt', () => {
    const result = determineResponseStyle(undefined, undefined, 'Casual');

    expect(result.maxTokens).toBeLessThan(200);
  });

  it('should always return all three fields', () => {
    const result = determineResponseStyle('Eager', 'Confident', 'Verbose');

    expect(result).toHaveProperty('maxTokens');
    expect(result).toHaveProperty('temperature');
    expect(result).toHaveProperty('lengthGuideline');
    expect(typeof result.maxTokens).toBe('number');
    expect(typeof result.temperature).toBe('number');
    expect(typeof result.lengthGuideline).toBe('string');
  });
});
