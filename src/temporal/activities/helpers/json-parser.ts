import { workflowLogger } from '@/lib/logger';

/**
 * Aggressively extracts and parses JSON from AI responses
 *
 * This function handles various edge cases where AI responses include
 * extra text, formatting, or malformed JSON. It uses multiple fallback strategies:
 * 1. Direct parse (fast path for clean JSON)
 * 2. Extract JSON between first '{' and last '}'
 * 3. Sanitize common issues (comments, control chars, trailing commas, etc.)
 * 4. Return safe fallback object if all else fails
 *
 * @param text - Raw text from AI response that should contain JSON
 * @returns Parsed JSON object, or safe fallback object if parsing fails
 */
export function extractJSON(text: string): Record<string, unknown> {
  try {
    // 1. Try parsing pure text first (fast path)
    return JSON.parse(text);
  } catch (e) {
    // 2. Locate the first '{' and the last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || start >= end) {
      workflowLogger.error({ text: text.substring(0, 100) }, "JSON Extraction Failed: No braces found");
      throw new Error("No JSON found");
    }

    let jsonCandidate = text.substring(start, end + 1);

    // 3. Aggressive Sanitization
    jsonCandidate = jsonCandidate
      .replace(/\\n/g, " ")                // Remove newlines
      .replace(/[\u0000-\u0019]+/g, "")    // Remove control chars
      .replace(/\/\/.*$/gm, "")            // Remove JS-style comments
      .replace(/:\s*TRUE/gi, ": true")     // Fix uppercase booleans
      .replace(/:\s*FALSE/gi, ": false")
      .replace(/,(\s*})/g, "$1");          // Remove trailing commas

    try {
      return JSON.parse(jsonCandidate);
    } catch (finalError) {
      workflowLogger.error({ jsonCandidate: jsonCandidate.substring(0, 100), error: finalError }, "JSON Extraction Failed after cleanup");
      // Fallback: Return a safe default object with _failed flag
      return {
        _failed: true,
        reasoning: "JSON parsing failed",
        outfit: "",
        location: "",
        action_summary: "",
        is_user_present: false,
        visual_tags: "",
        expression: "neutral",
        lighting: "cinematic"
      };
    }
  }
}

/**
 * Cleans tag strings by removing unwanted characters
 *
 * Removes parentheses and trailing periods from tag strings
 * to ensure clean formatting for Stable Diffusion prompts.
 *
 * @param str - Tag string to clean
 * @returns Cleaned tag string, or empty string if input is falsy
 */
export function cleanTagString(str: string): string {
  if (!str) return "";
  return str.replace(/[()]/g, "").replace(/\.$/, "").trim();
}
