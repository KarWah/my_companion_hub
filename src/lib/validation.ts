import { z } from 'zod';

// Schema for Companion Creation/Editing
export const companionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().min(10, "Personality description must be at least 10 characters"),
  visualDescription: z.string().min(10, "Visual description must be at least 10 characters"),
  userAppearance: z.string().optional(), // Optional field
  defaultOutfit: z.string().min(1, "Default outfit is required"),
  headerImage: z.string().optional(), // Base64 string, optional
});

// Schema for Chat Messages
export const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message is too long"),
  companionId: z.string().uuid("Invalid companion ID"),
  generateImage: z.coerce.boolean().optional(), // handle "on"/"off" checkbox strings
});

// Password complexity schema
export const passwordComplexitySchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Schema for User Registration
export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

// Validate password complexity and return detailed errors
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordComplexitySchema.safeParse(password);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => e.message)
  };
}