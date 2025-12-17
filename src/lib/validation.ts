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

// Schema for User Registration
export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    // You can add complex regex here for uppercase/numbers if desired
});