/**
 * Context Analysis Type Definitions
 *
 * Types for AI context analysis and state tracking.
 */

/**
 * Raw response from LLM context analysis
 */
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

/**
 * Normalized context analysis result
 */
export interface ContextAnalysis {
  outfit: string;
  location: string;
  action: string;
  visualTags: string;
  isUserPresent: boolean;
  expression: string;
  lighting: string;
}
