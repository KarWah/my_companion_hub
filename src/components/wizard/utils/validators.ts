// Validation utilities and constants

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an image file for size and type
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validates required wizard fields
 */
export function validateRequiredFields(state: any): string[] {
  const missing: string[] = [];

  if (!state.name || state.name.trim() === '') {
    missing.push('name');
  }

  // Add more validations as needed

  return missing;
}
