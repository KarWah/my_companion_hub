/**
 * Text sanitization utilities to prevent XSS and other injection attacks.
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;"
};

/**
 * Escape HTML entities in a string to prevent XSS
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove potentially dangerous HTML/script content
 * This is more aggressive than escaping - it strips instead of encoding
 */
export function stripHtml(text: string): string {
  // Remove script tags and their contents
  let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove style tags and their contents
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // Remove javascript: URLs
  cleaned = cleaned.replace(/javascript:/gi, "");

  // Remove data: URLs (can be used for XSS)
  cleaned = cleaned.replace(/data:/gi, "");

  // Remove event handlers
  cleaned = cleaned.replace(/on\w+\s*=/gi, "");

  return cleaned.trim();
}

/**
 * Sanitize user input text - removes dangerous content while preserving safe text
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";

  // Strip HTML and dangerous content
  let cleaned = stripHtml(input);

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ");

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Sanitize an array of strings
 */
export function sanitizeArrayField(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeText).filter((item) => item.length > 0);
}

/**
 * Sanitize a JSON string field (for extended personality, etc.)
 */
export function sanitizeJsonField(json: string | null | undefined): string | null {
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);
    // Recursively sanitize all string values in the object
    const sanitized = sanitizeObject(parsed);
    return JSON.stringify(sanitized);
  } catch {
    // If not valid JSON, sanitize as regular text
    return sanitizeText(json);
  }
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }

  return obj;
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
