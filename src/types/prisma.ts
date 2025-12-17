import { Prisma } from "@prisma/client";

// Export clean types for use throughout the app
export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Companion = {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  userAppearance: string | null;
  defaultOutfit: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  avatarUrl: string | null;
  headerImage: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  role: string;
  content: string;
  imageUrl: string | null;
  companionId: string;
  createdAt: Date;
};

// Context type for Temporal workflows
export type ContextAnalysis = {
  outfit: string;
  location: string;
  action: string;
  visualTags: string;
  isUserPresent: boolean;
  expression: string;
  lighting: string;
};

// Message history type for LLM
export type MessageHistory = {
  role: "user" | "assistant";
  content: string;
};

// Server action result types
export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Stable Diffusion generation parameters
export type SDGenerationParams = {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  sampler_name: string;
};
