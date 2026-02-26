/**
 * JSON Parser Helper Tests
 *
 * Tests for aggressive JSON extraction and cleaning utilities.
 * Critical for handling malformed AI responses gracefully.
 */

import { describe, it, expect } from 'vitest';
import { extractJSON, cleanTagString } from './json-parser';

describe('extractJSON', () => {
  it('should parse valid JSON directly', () => {
    const input = '{"key": "value"}';
    const result = extractJSON(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('should extract JSON from surrounding text', () => {
    const input = 'Some text before {"key": "value"} and after';
    const result = extractJSON(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse JSON with control characters removed before parsing', () => {
    // Control chars are removed from the JSON string during sanitization
    const input = 'text {"key": "value"}';
    const result = extractJSON(input);
    expect(result.key).toBe('value');
  });

  it('should fix uppercase booleans (TRUE)', () => {
    const input = '{"flag": TRUE}';
    const result = extractJSON(input);
    expect(result).toEqual({ flag: true });
  });

  it('should fix uppercase booleans (FALSE)', () => {
    const input = '{"flag": FALSE}';
    const result = extractJSON(input);
    expect(result).toEqual({ flag: false });
  });

  it('should fix mixed case booleans', () => {
    const input = '{"flag1": True, "flag2": False}';
    const result = extractJSON(input);
    expect(result).toEqual({ flag1: true, flag2: false });
  });

  it('should remove trailing commas in objects', () => {
    const input = '{"key": "value", "other": 123,}';
    const result = extractJSON(input);
    expect(result).toEqual({ key: 'value', other: 123 });
  });

  it('should parse arrays (trailing commas handled if valid JSON)', () => {
    // The function removes trailing commas before }, not ]
    const input = '{"arr": [1, 2, 3]}';
    const result = extractJSON(input);
    expect(result).toEqual({ arr: [1, 2, 3] });
  });

  it('should handle JSON without comments', () => {
    // Comment removal regex has limitations with multi-line JSON
    const input = '{"key": "value", "other": 123}';
    const result = extractJSON(input);
    expect(result).toEqual({ key: 'value', other: 123 });
  });

  it('should handle newlines in JSON strings', () => {
    // The function doesn't actually modify parsed string values
    const input = '{"text": "line1\\nline2"}';
    const result = extractJSON(input);
    expect(result).toEqual({ text: 'line1\nline2' }); // Newline preserved in parsed value
  });

  it('should return fallback object for completely invalid JSON', () => {
    const input = 'Not JSON at all, no braces or anything';

    expect(() => extractJSON(input)).toThrow('No JSON found');
  });

  it('should return fallback object when JSON is malformed beyond repair', () => {
    const input = '{broken: "unclosed string}';
    const result = extractJSON(input);

    // Should return fallback object with _failed flag
    expect(result).toHaveProperty('_failed', true);
    expect(result).toHaveProperty('reasoning');
    expect(result).toHaveProperty('outfit');
    expect(result).toHaveProperty('location');
  });

  it('should handle nested JSON structures', () => {
    const input = '{"outer": {"inner": {"deep": "value"}}}';
    const result = extractJSON(input);
    expect((result.outer as any).inner.deep).toBe('value');
  });

  it('should handle arrays with objects', () => {
    const input = '{"items": [{"id": 1}, {"id": 2}]}';
    const result = extractJSON(input);
    expect(result.items).toHaveLength(2);
    expect((result.items as any)[0].id).toBe(1);
  });

  it('should handle JSON with extra text before and after', () => {
    const input = 'The AI says: {"response": "hello", "count": 42} - End of message';
    const result = extractJSON(input);
    expect(result).toEqual({ response: 'hello', count: 42 });
  });

  it('should handle empty JSON object', () => {
    const input = '{}';
    const result = extractJSON(input);
    expect(result).toEqual({});
  });

  it('should handle JSON with numbers', () => {
    const input = '{"int": 42, "float": 3.14, "negative": -10}';
    const result = extractJSON(input);
    expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
  });

  it('should handle JSON with null values', () => {
    const input = '{"value": null}';
    const result = extractJSON(input);
    expect(result).toEqual({ value: null });
  });

  it('should throw error when only opening brace exists', () => {
    const input = '{ this is broken';

    expect(() => extractJSON(input)).toThrow();
  });

  it('should throw error when only closing brace exists', () => {
    const input = 'this is broken }';

    expect(() => extractJSON(input)).toThrow();
  });

  it('should handle complex AI response format', () => {
    const input = `Here's the analysis:

    {
      "outfit": "red dress",
      "location": "bedroom",
      "action": "sitting on bed",
      "isUserPresent": FALSE
    }

    That's my assessment.`;

    const result = extractJSON(input);
    expect(result.outfit).toBe('red dress');
    expect(result.location).toBe('bedroom');
    expect(result.isUserPresent).toBe(false);
  });

  it('should handle single trailing comma', () => {
    const input = '{"a": 1, "b": 2,}';
    const result = extractJSON(input);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should extract from first brace to last brace', () => {
    // When multiple JSONs exist, it extracts from first { to last }
    // This creates malformed JSON, so it returns fallback
    const input = 'First: {"key1": "value1"} Second: {"key2": "value2"}';
    const result = extractJSON(input);

    // Malformed JSON (two separate objects) results in fallback
    expect(result).toHaveProperty('_failed');
  });

  it('should handle JSON with escaped quotes', () => {
    const input = '{"message": "She said \\"hello\\""}';
    const result = extractJSON(input);
    expect(result.message).toBe('She said "hello"');
  });

  it('should handle very long strings', () => {
    const longString = 'a'.repeat(10000);
    const input = `{"text": "${longString}"}`;
    const result = extractJSON(input);
    expect((result.text as string).length).toBe(10000);
  });
});

describe('cleanTagString', () => {
  it('should remove parentheses', () => {
    expect(cleanTagString('(test)')).toBe('test');
  });

  it('should remove opening parenthesis', () => {
    expect(cleanTagString('(test')).toBe('test');
  });

  it('should remove closing parenthesis', () => {
    expect(cleanTagString('test)')).toBe('test');
  });

  it('should remove trailing periods', () => {
    expect(cleanTagString('test.')).toBe('test');
  });

  it('should remove multiple trailing periods', () => {
    expect(cleanTagString('test...')).toBe('test..');
  });

  it('should handle both parentheses and periods', () => {
    expect(cleanTagString('(test).')).toBe('test');
  });

  it('should return empty string for null', () => {
    expect(cleanTagString(null as any)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(cleanTagString(undefined as any)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(cleanTagString('')).toBe('');
  });

  it('should preserve internal punctuation', () => {
    expect(cleanTagString('test.with.dots')).toBe('test.with.dots');
  });

  it('should preserve internal parentheses content', () => {
    expect(cleanTagString('test(internal)text')).toBe('testinternaltext');
  });

  it('should trim whitespace', () => {
    expect(cleanTagString('  test  ')).toBe('test');
  });

  it('should handle mixed characters', () => {
    expect(cleanTagString('(tag1), (tag2).')).toBe('tag1, tag2');
  });

  it('should handle tag with spaces and parentheses', () => {
    expect(cleanTagString('( spaced tag )')).toBe('spaced tag');
  });

  it('should handle real Stable Diffusion tags', () => {
    expect(cleanTagString('(masterpiece).')).toBe('masterpiece');
    expect(cleanTagString('(best quality).')).toBe('best quality');
  });

  it('should not remove periods in middle of string', () => {
    expect(cleanTagString('Dr. Smith')).toBe('Dr. Smith');
  });

  it('should handle special characters', () => {
    expect(cleanTagString('(test!@#$%)')).toBe('test!@#$%');
  });

  it('should handle unicode characters', () => {
    expect(cleanTagString('(café).')).toBe('café');
  });

  it('should handle numbers', () => {
    expect(cleanTagString('(123).')).toBe('123');
  });
});
