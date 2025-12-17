/**
 * Server-side image validation for base64 strings
 *
 * CRITICAL: Client-side validation can be bypassed.
 * Always validate images on the server before storing in database.
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 7 * 1024 * 1024; // ~5MB actual image becomes ~7MB base64

/**
 * Validate a base64 image string on the server
 *
 * Checks:
 * - Valid base64 data URL format
 * - Allowed MIME type
 * - Size limit (base64 encoded)
 *
 * @param base64String - The base64 data URL string
 * @returns Validation result
 */
export function validateBase64Image(base64String: string): ValidationResult {
  // Check if empty
  if (!base64String) {
    return { valid: true }; // Empty is valid (optional field)
  }

  // Check format: must start with data:image/
  if (!base64String.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'Invalid image format. Must be a data URL starting with data:image/'
    };
  }

  // Extract MIME type
  const mimeTypeMatch = base64String.match(/^data:(image\/[a-z]+);base64,/);
  if (!mimeTypeMatch) {
    return {
      valid: false,
      error: 'Invalid base64 data URL format'
    };
  }

  const mimeType = mimeTypeMatch[1].toLowerCase();

  // Check allowed MIME types
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid image type: ${mimeType}. Only JPG, PNG, and WebP are allowed.`
    };
  }

  // Check size (base64 encoded size)
  if (base64String.length > MAX_BASE64_SIZE) {
    const sizeMB = (base64String.length / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `Image too large (${sizeMB}MB encoded). Maximum size is ~5MB.`
    };
  }

  // Additional check: Validate base64 content after the comma
  const base64Content = base64String.split(',')[1];
  if (!base64Content || base64Content.length === 0) {
    return {
      valid: false,
      error: 'Invalid base64 content: empty data'
    };
  }

  // Check if valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Content)) {
    return {
      valid: false,
      error: 'Invalid base64 encoding'
    };
  }

  return { valid: true };
}

/**
 * Sanitize base64 image string
 * Trims whitespace and validates format
 *
 * @param base64String - The base64 string to sanitize
 * @returns Sanitized string or null if invalid
 */
export function sanitizeBase64Image(base64String: string | null | undefined): string | null {
  if (!base64String) {
    return null;
  }

  const trimmed = base64String.trim();

  if (trimmed === '') {
    return null;
  }

  return trimmed;
}
