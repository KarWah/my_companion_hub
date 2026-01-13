// types/index.ts

// ==========================================
// 1. DATABASE ENTITIES (Source of Truth)
// ==========================================

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

  // Identity fields
  relationship: string; // Relationship to user
  hobbies: string[]; // Array of hobbies/interests
  fetishes: string[]; // Array of fetishes/kinks
  occupation: string; // Occupation/role
  personalityArchetype: string; // Personality type
  style: ArtStyle; // Art style for image generation (anime or realistic)

  // CRITICAL: Both outfit fields must exist here to fix your error
  defaultOutfit: string;
  currentOutfit: string;

  currentLocation: string;
  currentAction: string;

  headerImageUrl: string | null;
  headerImageLegacy: string | null;

  // Extended personality (JSON string)
  extendedPersonality: string | null;

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

// ==========================================
// 2. SHARED UTILITY TYPES
// ==========================================

export type MessageHistory = {
  role: "user" | "assistant";
  content: string;
};

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

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

// ==========================================
// 3. WIZARD STATE (Frontend)
// ==========================================

export type ArtStyle = 'realistic' | 'anime';
export type BodyType = 'slim' | 'athletic' | 'curvy' | 'chubby' | 'muscular';
export type BreastSize = 'flat' | 'small' | 'medium' | 'large' | 'huge';
export type ButtSize = 'small' | 'medium' | 'large';

export interface CompanionWizardState {
  // Appearance
  style: ArtStyle;
  ethnicity: string;
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: string;
  bodyType: BodyType;
  breastSize: BreastSize;
  buttSize: ButtSize;
  age: number;
  height: string;

  // Identity
  name: string;
  occupation: string;
  personalityArchetype: string;
  relationship: string;
  hobbies: string[];
  fetishes: string[];

  // Context
  defaultOutfit: string;
  userAppearance: string;

  // Custom
  customVisualPrompt: string;
  customSystemInstruction: string;

  // Extended Personality Fields
  speechStyle: string;
  speechPattern: string[];
  behaviorTraits: string[];
  initiationStyle: string;
  confidenceLevel: string;
  emotionalTraits: string[];
  vulnerabilities: string[];
  quirks: string[];
  flirtationStyle: string;
  humorStyle: string;
  intimacyPace: string;
}

export const INITIAL_WIZARD_STATE: CompanionWizardState = {
  style: 'anime',
  ethnicity: 'White',
  skinTone: 'pale',
  eyeColor: 'blue',
  hairColor: 'blonde',
  hairStyle: 'long straight',
  bodyType: 'curvy',
  breastSize: 'large',
  buttSize: 'medium',
  age: 23,
  height: 'average',
  name: '',
  occupation: 'Personal Trainer',
  personalityArchetype: 'Adventurous',
  relationship: 'Neighbor',
  hobbies: [],
  fetishes: [],
  defaultOutfit: 'oversized hoodie, black shorts',
  userAppearance: '',
  customVisualPrompt: '',
  customSystemInstruction: '',

  // Extended Personality Defaults
  speechStyle: 'casual',
  speechPattern: [],
  behaviorTraits: [],
  initiationStyle: 'balanced',
  confidenceLevel: 'confident',
  emotionalTraits: [],
  vulnerabilities: [],
  quirks: [],
  flirtationStyle: 'playful',
  humorStyle: 'playful',
  intimacyPace: 'natural',
};

// ==========================================
// 4. AI & CONTEXT (LLM Analysis)
// ==========================================

export interface ContextAnalysisResponse {
  reasoning: string;
  outfit: string;
  location: string;
  action_summary: string;
  is_user_present: boolean;
  visual_tags: string;
  expression: string;
  lighting: string;
}

export interface ContextAnalysis {
  outfit: string;
  location: string;
  action: string;
  visualTags: string;
  isUserPresent: boolean;
  expression: string;
  lighting: string;
}

// ==========================================
// 5. WORKFLOW & STREAMING (Temporal)
// ==========================================

export type WorkflowStatus =
  | 'started'
  | 'analyzing'
  | 'responding'
  | 'imaging'
  | 'completed'
  | 'failed';

export interface WorkflowResult {
  text: string;
  imageUrl: string | null;
  updatedState: {
    outfit: string;
    location: string;
    action: string;
    expression: string;
  };
}

export interface WorkflowProgress {
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  streamedText: string;
  imageUrl?: string | null;
  error?: string;
}

export interface StreamState {
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  streamedText: string;
  imageUrl?: string | null;
  isComplete: boolean;
  error?: string;
  finalResult?: WorkflowResult;
}

export interface ChatWorkflowArgs {
  companionId: string;
  companionName: string;
  userMessage: string;
  userName: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  msgHistory: MessageHistory[];
  shouldGenerateImage: boolean;
}