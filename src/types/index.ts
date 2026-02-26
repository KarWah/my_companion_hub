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
  currentMood: string;

  headerImageUrl: string | null;
  headerImageLegacy: string | null;

  // Extended personality (JSON string)
  extendedPersonality: string | null;

  // Community/Discovery fields
  isPublic: boolean;
  publishedAt: Date | null;
  viewCount: number;
  chatCount: number;

  // Relationship progression
  affectionLevel: number;
  trustLevel: number;

  // Voice Integration
  voiceId: string | null;
  voiceEnabled: boolean;

  // Soft delete
  deletedAt: Date | null;

  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  audioUrl: string | null; // ElevenLabs TTS audio
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

  // Voice Settings
  voiceId: string | null;
  voiceEnabled: boolean;
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

  // Voice Settings
  voiceId: null,
  voiceEnabled: false,
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
  mood: string;
}

export interface ContextAnalysis {
  outfit: string;
  location: string;
  action: string;
  visualTags: string;
  isUserPresent: boolean;
  expression: string;
  lighting: string;
  mood: string;
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
  audioUrl: string | null;
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
  audioUrl?: string | null;
  error?: string;
}

export interface StreamState {
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  streamedText: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
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
  // Voice generation
  voiceEnabled?: boolean;
  voiceId?: string;
  // Message ID for memory attribution
  userMessageId?: string;
  // Companion state at turn start (for change detection)
  currentMood?: string;
  // Feature flags passed from client settings
  ragEnabled?: boolean;   // Whether to retrieve memories (default: true)
  deepThink?: boolean;    // Whether to use extended reasoning mode (default: false)
}

// ==========================================
// 6. MEMORY SYSTEM
// ==========================================

export interface MemoryRecord {
  id: string;
  companionId: string;
  content: string;
  category: 'personal_fact' | 'preference' | 'event' | 'relationship' | 'emotional_moment';
  importance: number; // 1-10
  embedding?: number[]; // 1536-dim vector
  sourceMessageIds: string[];
  context?: string;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryExtractionResult {
  memories: Array<{
    content: string;
    category: string;
    importance: number;
    context: string;
  }>;
  relationshipUpdate?: {
    status: string;
    affectionDelta: number;
    trustDelta: number;
  };
}

export interface MemoryRetrievalResult {
  memories: MemoryRecord[];
  totalRelevant: number;
}

// ==========================================
// 7. COMMUNITY/DISCOVERY SYSTEM
// ==========================================

export interface PublicCompanion {
  id: string;
  name: string;
  description: string;
  visualDescription: string;
  headerImageUrl: string | null;
  style: ArtStyle;
  relationship: string;
  occupation: string;
  personalityArchetype: string;
  hobbies: string[];
  fetishes: string[];
  extendedPersonality: string | null;
  viewCount: number;
  chatCount: number;
  publishedAt: Date | null;
  creatorId: string;
  creatorUsername: string;
  averageRating: number;
  ratingCount: number;
}

export interface DiscoveryFilters {
  fetishes?: string[];
  relationships?: string[];
  occupations?: string[];
  hobbies?: string[];
  personalityArchetype?: string;
  ethnicity?: string;
  style?: ArtStyle;
  search?: string;
  sortBy?: 'newest' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export interface Rating {
  id: string;
  companionId: string;
  userId: string;
  rating: number; // 1-5
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 8. SCHEDULED MESSAGING
// ==========================================

export interface ScheduledMessage {
  id: string;
  companionId: string;
  cronExpression: string;
  messageTemplate: string;
  timezone: string;
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleLog {
  id: string;
  scheduledMessageId: string;
  status: 'success' | 'failed' | 'skipped';
  workflowId: string | null;
  error: string | null;
  executedAt: Date;
}

export interface CreateScheduledMessageInput {
  companionId: string;
  cronExpression: string;
  messageTemplate: string;
  timezone?: string;
}

// ==========================================
// 9. VOICE/TTS SYSTEM (ElevenLabs)
// ==========================================

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
  labels: Record<string, string>;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// ==========================================
// 10. AUDIT LOGGING
// ==========================================

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export type AuditAction =
  | 'login'
  | 'register'
  | 'logout'
  | 'companion_create'
  | 'companion_update'
  | 'companion_delete'
  | 'companion_publish'
  | 'companion_unpublish'
  | 'companion_clone'
  | 'message_send'
  | 'rating_create'
  | 'scheduled_message_create'
  | 'scheduled_message_delete';