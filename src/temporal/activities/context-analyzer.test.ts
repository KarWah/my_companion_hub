/**
 * Context Analyzer Activity Tests
 *
 * Tests for conversation context analysis and visual state extraction.
 * Critical for maintaining consistent image generation state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeConversationContext } from './context-analyzer';
import type { MessageHistory } from '@/types';

describe('analyzeConversationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve previous outfit when LLM returns generic term', async () => {
    const genericTerms = ['casual', 'unknown', 'clothing', 'no specified', 'n/a'];

    for (const term of genericTerms) {
      vi.clearAllMocks();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                outfit: term,
                location: 'bedroom',
                action_summary: 'relaxing',
                visual_tags: '',
                is_user_present: false,
                expression: 'neutral',
                lighting: 'soft lighting'
              })
            }
          }]
        })
      });

      const result = await analyzeConversationContext(
        'red dress', // current outfit
        'bedroom',
        'sitting',
        'Hey there',
        [],
        'Lumen',
        'Karl',
        'Hi!'
      );

      expect(result.outfit).toBe('red dress'); // Should preserve, not change to generic term
    }
  });

  it('should detect user presence from response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'blue jeans, white t-shirt',
              location: 'park',
              action_summary: 'walking together',
              visual_tags: '2people, holding hands',
              is_user_present: true,
              expression: 'happy',
              lighting: 'sunny day'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'blue jeans, white t-shirt',
      'park',
      'standing',
      'Let\'s walk together',
      [],
      'Lumen',
      'Karl',
      'Sure!'
    );

    expect(result.isUserPresent).toBe(true);
    expect(result.visualTags).toContain('2people');
  });

  it('should return fallback state on API error', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal server error'
    });

    const result = await analyzeConversationContext(
      'hoodie',
      'room',
      'sitting',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('hoodie'); // Preserved
    expect(result.location).toBe('room'); // Preserved
    expect(result.action).toBe('sitting'); // Preserved
    expect(result.visualTags).toBe('');
    expect(result.isUserPresent).toBe(false);
    expect(result.expression).toBe('neutral');
    expect(result.lighting).toBe('cinematic lighting');
  });

  it('should handle malformed JSON with graceful fallback', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Not valid JSON at all'
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'shirt',
      'bedroom',
      'lying',
      'test',
      [],
      'Lumen',
      'Karl',
      'test'
    );

    // Should return previous state
    expect(result.outfit).toBe('shirt');
    expect(result.location).toBe('bedroom');
    expect(result.action).toBe('lying');
  });

  it('should map conversation history with speaker names', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'kitchen',
              action_summary: 'cooking',
              visual_tags: '',
              is_user_present: false,
              expression: 'focused',
              lighting: 'bright'
            })
          }
        }]
      })
    });
    global.fetch = mockFetch as any;

    const history: MessageHistory[] = [
      { role: 'user', content: 'Hi!' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'I\'m good!' }
    ];

    await analyzeConversationContext(
      'dress',
      'kitchen',
      'standing',
      'What are you making?',
      history,
      'Lumen',
      'Karl',
      'Making pasta'
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = callBody.messages[1].content;

    expect(userContent).toContain('User (Karl): Hi!');
    expect(userContent).toContain('Companion (Lumen): Hello!');
    expect(userContent).toContain('User (Karl): How are you?');
    expect(userContent).toContain('Companion (Lumen): I\'m good!');
  });

  it('should clean tags using cleanTagString', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: '(red dress).',
              location: '(bedroom).',
              action_summary: '(sitting on bed).',
              visual_tags: '(soft focus).',
              is_user_present: false,
              expression: '(smiling).',
              lighting: '(dim lighting).'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'white dress',
      'living room',
      'standing',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('red dress'); // Cleaned
    expect(result.location).toBe('bedroom'); // Cleaned
    expect(result.visualTags).toBe('soft focus'); // Cleaned
    expect(result.expression).toBe('smiling'); // Cleaned
    expect(result.lighting).toBe('dim lighting'); // Cleaned
  });

  it('should use default values for missing fields', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'jeans',
              location: 'park',
              action_summary: 'walking'
              // Missing: visual_tags, is_user_present, expression, lighting
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress',
      'room',
      'sitting',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.visualTags).toBe(''); // Default empty
    expect(result.isUserPresent).toBe(false); // Default false
    expect(result.expression).toBe('neutral'); // Default neutral
    expect(result.lighting).toBe('cinematic lighting'); // Default
  });

  it('should handle empty outfit response by preserving current', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: '',
              location: 'bedroom',
              action_summary: 'relaxing',
              visual_tags: '',
              is_user_present: false,
              expression: 'calm',
              lighting: 'soft'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'pajamas',
      'bedroom',
      'lying',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('pajamas'); // Preserved because response was empty
  });

  it('should handle empty location response by preserving current', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: '',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress',
      'kitchen',
      'cooking',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.location).toBe('kitchen'); // Preserved
  });

  it('should handle empty action response by preserving current', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'bedroom',
              action_summary: '',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'soft'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress',
      'bedroom',
      'reading',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.action).toBe('reading'); // Preserved
  });

  it('should update outfit when valid specific outfit provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'blue sundress',
              location: 'beach',
              action_summary: 'walking on sand',
              visual_tags: 'ocean, sunset',
              is_user_present: false,
              expression: 'peaceful',
              lighting: 'golden hour'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'red dress',
      'park',
      'sitting',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('blue sundress'); // Changed
    expect(result.location).toBe('beach'); // Changed
    expect(result.action).toBe('walking on sand'); // Changed
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network timeout'));

    const result = await analyzeConversationContext(
      'hoodie',
      'room',
      'gaming',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('hoodie');
    expect(result.location).toBe('room');
    expect(result.action).toBe('gaming');
  });

  it('should use correct API endpoint and model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'room',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright'
            })
          }
        }]
      })
    });
    global.fetch = mockFetch as any;

    await analyzeConversationContext(
      'dress',
      'room',
      'sitting',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.novita.ai/v3/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('sao10k/l31-70b-euryale-v2.2');
    expect(callBody.temperature).toBe(0.2);
    expect(callBody.max_tokens).toBe(600);
  });

  it('should limit history to last 8 messages', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'room',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright'
            })
          }
        }]
      })
    });
    global.fetch = mockFetch as any;

    // 16 messages: last 8 (Messages 5-8) should be included, first 8 (Messages 1-4) excluded
    const longHistory: MessageHistory[] = [
      { role: 'user', content: 'Message 1' },
      { role: 'assistant', content: 'Response 1' },
      { role: 'user', content: 'Message 2' },
      { role: 'assistant', content: 'Response 2' },
      { role: 'user', content: 'Message 3' },
      { role: 'assistant', content: 'Response 3' },
      { role: 'user', content: 'Message 4' },
      { role: 'assistant', content: 'Response 4' },
      { role: 'user', content: 'Message 5' }, // First included
      { role: 'assistant', content: 'Response 5' },
      { role: 'user', content: 'Message 6' },
      { role: 'assistant', content: 'Response 6' },
      { role: 'user', content: 'Message 7' },
      { role: 'assistant', content: 'Response 7' },
      { role: 'user', content: 'Message 8' },
      { role: 'assistant', content: 'Response 8' }, // Last included
    ];

    await analyzeConversationContext(
      'dress',
      'room',
      'sitting',
      'Latest message',
      longHistory,
      'Lumen',
      'Karl',
      'Latest response'
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = callBody.messages[1].content;

    // Should only include last 8 messages from history
    expect(userContent).not.toContain('Message 1');
    expect(userContent).not.toContain('Message 2');
    expect(userContent).not.toContain('Message 3');
    expect(userContent).not.toContain('Message 4');
    expect(userContent).toContain('Message 5');
    expect(userContent).toContain('Response 5');
    expect(userContent).toContain('Message 8');
    expect(userContent).toContain('Response 8');
  });

  it('should handle parse failure by keeping previous state', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'This will trigger the fallback response from extractJSON'
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'black hoodie',
      'gaming room',
      'playing video games',
      'test',
      [],
      'Lumen',
      'Karl',
      'response'
    );

    expect(result.outfit).toBe('black hoodie');
    expect(result.location).toBe('gaming room');
    expect(result.action).toBe('playing video games');
    expect(result.visualTags).toBe('');
  });

  it('should convert is_user_present to boolean correctly', async () => {
    const testCases = [
      { input: true, expected: true },
      { input: false, expected: false },
      { input: 'true', expected: true },
      { input: 'false', expected: true }, // Note: String 'false' is truthy in JavaScript
      { input: 1, expected: true },
      { input: 0, expected: false },
      { input: null, expected: false },
      { input: undefined, expected: false }
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                outfit: 'dress',
                location: 'room',
                action_summary: 'standing',
                visual_tags: '',
                is_user_present: testCase.input,
                expression: 'neutral',
                lighting: 'bright'
              })
            }
          }]
        })
      });

      const result = await analyzeConversationContext(
        'dress',
        'room',
        'sitting',
        'test',
        [],
        'Lumen',
        'Karl',
        'response'
      );

      expect(result.isUserPresent).toBe(testCase.expected);
    }
  });

  // ── Mood field tests ─────────────────────────────────────────────────────────

  it('should extract mood from LLM response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'bedroom',
              action_summary: 'sitting',
              visual_tags: '',
              is_user_present: false,
              expression: 'smiling',
              lighting: 'soft',
              mood: 'happy'
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress', 'bedroom', 'sitting', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('happy');
  });

  it('should accept all 12 valid moods', async () => {
    const validMoods = [
      'neutral', 'happy', 'playful', 'affectionate', 'excited', 'flirty',
      'melancholic', 'irritated', 'jealous', 'worried', 'embarrassed', 'aroused'
    ];

    for (const mood of validMoods) {
      vi.clearAllMocks();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                outfit: 'dress',
                location: 'room',
                action_summary: 'standing',
                visual_tags: '',
                is_user_present: false,
                expression: 'neutral',
                lighting: 'bright',
                mood
              })
            }
          }]
        })
      });

      const result = await analyzeConversationContext(
        'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
      );

      expect(result.mood, `mood '${mood}' should be passed through`).toBe(mood);
    }
  });

  it('should fall back to neutral for unknown mood value', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'room',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright',
              mood: 'confused_about_life'  // Not in VALID_MOODS
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('neutral');
  });

  it('should fall back to neutral when mood field is missing', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'room',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright'
              // mood intentionally omitted
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('neutral');
  });

  it('should normalise mood to lowercase before validation', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              outfit: 'dress',
              location: 'room',
              action_summary: 'standing',
              visual_tags: '',
              is_user_present: false,
              expression: 'neutral',
              lighting: 'bright',
              mood: 'HAPPY'  // Uppercase — should be normalised
            })
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('happy');
  });

  it('should return neutral mood in fallback state (API error)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error'
    });

    const result = await analyzeConversationContext(
      'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('neutral');
  });

  it('should return neutral mood in parse failure fallback', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'completely invalid JSON'
          }
        }]
      })
    });

    const result = await analyzeConversationContext(
      'dress', 'room', 'standing', 'test', [], 'Lumen', 'Karl', 'response'
    );

    expect(result.mood).toBe('neutral');
  });
});
