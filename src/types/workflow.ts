/**
 * Workflow and Streaming Type Definitions
 *
 * Provides type-safe interfaces for Temporal workflows and streaming responses.
 */

export type WorkflowStatus =
  | 'started'
  | 'analyzing'
  | 'responding'
  | 'imaging'
  | 'completed'
  | 'failed';

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
  progress: number; // 0-100
  currentStep: string;
  streamedText: string; // Accumulates as tokens arrive
  imageUrl?: string | null;
  error?: string;
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

export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}
