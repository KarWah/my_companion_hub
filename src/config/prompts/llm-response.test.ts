/**
 * LLM Response Prompt Builder Tests
 *
 * Tests for system prompt generation including mood state, relationship
 * descriptors (affection/trust), and personality integration.
 */

import { describe, it, expect } from 'vitest';
import { buildLLMSystemPrompt } from './llm-response';
import type { ExtendedPersonality } from '@/lib/prompt-personality-adapter';

const BASE_ARGS = {
  companionName: 'Lumen',
  description: 'A warm and curious companion.',
  userName: 'Karl',
  currentAction: 'sitting',
  currentOutfit: 'casual dress',
  currentLocation: 'bedroom',
  memories: [] as string[],
  extendedPersonality: null as ExtendedPersonality | null,
};

describe('buildLLMSystemPrompt - fallback mode (no extended personality)', () => {
  it('should include companion name and user name', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null
    );

    expect(prompt).toContain('Lumen');
    expect(prompt).toContain('Karl');
  });

  it('should include current scene context (outfit, location, action)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      'gaming',
      'hoodie and jeans',
      'living room',
      BASE_ARGS.memories,
      null
    );

    expect(prompt).toContain('gaming');
    expect(prompt).toContain('hoodie and jeans');
    expect(prompt).toContain('living room');
  });

  it('should include current mood in the prompt', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'playful'
    );

    expect(prompt).toContain('playful');
  });

  it('should default mood to neutral when not provided', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null
    );

    expect(prompt).toContain('neutral');
  });

  it('should include affection descriptor for low affection (≤15)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      10  // affectionLevel = 10
    );

    expect(prompt).toContain('guarded and distant');
  });

  it('should include affection descriptor for mid affection (50)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      50  // affectionLevel = 50
    );

    expect(prompt).toContain('comfortable and friendly');
  });

  it('should include affection descriptor for high affection (>85)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      95  // affectionLevel = 95
    );

    expect(prompt).toContain('intensely devoted');
  });

  it('should include trust descriptor for low trust (≤15)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      50,
      10  // trustLevel = 10
    );

    expect(prompt).toContain('wary, on guard');
  });

  it('should include trust descriptor for mid trust (50)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      50,
      50  // trustLevel = 50
    );

    expect(prompt).toContain('comfortable baseline');
  });

  it('should include trust descriptor for high trust (>85)', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      undefined,
      false,
      'neutral',
      50,
      90  // trustLevel = 90
    );

    expect(prompt).toContain('complete trust');
  });

  it('should include memories when provided', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      ['User has a dog named Billy', 'User likes pizza'],
      null
    );

    expect(prompt).toContain('User has a dog named Billy');
    expect(prompt).toContain('User likes pizza');
  });

  it('should omit memory section when no memories', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      [],
      null
    );

    // The section header in the fallback prompt is "### MEMORIES (Things you remember...)"
    expect(prompt).not.toContain('### MEMORIES');
  });

  it('should include user appearance when user is present', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      'tall, muscular build',
      true  // isUserPresent
    );

    expect(prompt).toContain('tall, muscular build');
  });

  it('should omit user appearance when user is not present', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      null,
      'tall, muscular build',
      false  // isUserPresent
    );

    expect(prompt).not.toContain('tall, muscular build');
  });
});

describe('buildLLMSystemPrompt - extended personality mode', () => {
  const extendedPersonality: ExtendedPersonality = {
    personalityArchetype: 'Yandere',
    relationshipToUser: 'Girlfriend',
    speechStyle: 'Verbose',
    confidenceLevel: 'Confident',
    intimacyPace: 'Eager',
    behaviorTraits: ['possessive', 'devoted'],
    emotionalTraits: ['intense', 'passionate'],
  };

  it('should use personality-driven structure when extendedPersonality provided', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      extendedPersonality
    );

    // Extended personality prompts use different section headers
    expect(prompt).toContain('YOUR PERSONALITY IN ACTION');
    expect(prompt).toContain('RESPONSE GUIDELINES');
  });

  it('should include current mood in extended personality prompt', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      extendedPersonality,
      undefined,
      false,
      'excited'
    );

    expect(prompt).toContain('excited');
  });

  it('should include affection and trust descriptors in extended personality prompt', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      BASE_ARGS.currentAction,
      BASE_ARGS.currentOutfit,
      BASE_ARGS.currentLocation,
      BASE_ARGS.memories,
      extendedPersonality,
      undefined,
      false,
      'neutral',
      80,  // affectionLevel — should give 'strong affection, deeply cares'
      80   // trustLevel — should give 'deeply trusts you, shares secrets'
    );

    expect(prompt).toContain('strong affection');
    expect(prompt).toContain('deeply trusts');
  });

  it('should include scene context in extended prompt', () => {
    const prompt = buildLLMSystemPrompt(
      BASE_ARGS.companionName,
      BASE_ARGS.description,
      BASE_ARGS.userName,
      'gaming',
      'hoodie',
      'living room',
      BASE_ARGS.memories,
      extendedPersonality
    );

    expect(prompt).toContain('gaming');
    expect(prompt).toContain('hoodie');
    expect(prompt).toContain('living room');
  });
});

describe('affection and trust descriptor boundary values', () => {
  const testPrompt = (affection: number, trust: number) =>
    buildLLMSystemPrompt(
      'Lumen', 'desc', 'Karl', 'sitting', 'dress', 'room', [], null,
      undefined, false, 'neutral', affection, trust
    );

  it('should use "cautious, keeping walls up" for affection 16-30', () => {
    expect(testPrompt(25, 50)).toContain('cautious, keeping walls up');
  });

  it('should use "warming up, slowly trusting" for affection 31-45', () => {
    expect(testPrompt(40, 50)).toContain('warming up, slowly trusting');
  });

  it('should use "genuinely fond" for affection 56-70', () => {
    expect(testPrompt(65, 50)).toContain('genuinely fond');
  });

  it('should use "strong affection" for affection 71-85', () => {
    expect(testPrompt(80, 50)).toContain('strong affection');
  });

  it('should use "cautious, testing boundaries" for trust 16-30', () => {
    expect(testPrompt(50, 25)).toContain('cautious, testing boundaries');
  });

  it('should use "somewhat guarded" for trust 31-45', () => {
    expect(testPrompt(50, 40)).toContain('somewhat guarded');
  });

  it('should use "trusts you, opens up willingly" for trust 56-70', () => {
    expect(testPrompt(50, 65)).toContain('trusts you, opens up willingly');
  });

  it('should use "deeply trusts you, shares secrets" for trust 71-85', () => {
    expect(testPrompt(50, 80)).toContain('deeply trusts you, shares secrets');
  });
});
