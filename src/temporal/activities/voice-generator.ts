/**
 * Voice Generator Activity
 *
 * Generates TTS audio for companion messages using ElevenLabs.
 */

import { generateSpeech, isElevenLabsConfigured } from "@/lib/elevenlabs";
import { uploadAudioFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export interface VoiceGenerationInput {
  companionId: string;
  voiceId: string;
  text: string;
}

export interface VoiceGenerationResult {
  audioUrl: string | null;
  error?: string;
}

/**
 * Generate voice audio for a companion message
 */
export async function generateVoiceAudio(
  input: VoiceGenerationInput
): Promise<VoiceGenerationResult> {
  const { companionId, voiceId, text } = input;

  // Skip if ElevenLabs is not configured
  if (!isElevenLabsConfigured()) {
    logger.info("ElevenLabs not configured, skipping voice generation");
    return { audioUrl: null };
  }

  // Skip if no voice ID
  if (!voiceId) {
    logger.info("No voice ID provided, skipping voice generation");
    return { audioUrl: null };
  }

  // Skip if text is too short
  if (!text || text.trim().length < 5) {
    logger.info("Text too short for voice generation");
    return { audioUrl: null };
  }

  try {
    logger.info(
      { companionId, voiceId, textLength: text.length },
      "Starting voice generation"
    );

    // Clean text for better TTS output
    const cleanedText = cleanTextForTTS(text);

    // Generate speech
    const audioBuffer = await generateSpeech(voiceId, cleanedText);

    // Convert ArrayBuffer to Buffer for upload
    const audioData = Buffer.from(audioBuffer);

    // Upload to storage
    const uploadResult = await uploadAudioFile(audioData, companionId);

    logger.info(
      { companionId, audioUrl: uploadResult.url },
      "Voice generation completed"
    );

    return { audioUrl: uploadResult.url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, companionId }, "Voice generation failed");

    // Don't fail the whole workflow for voice errors
    return { audioUrl: null, error: errorMessage };
  }
}

/**
 * Clean text for better TTS output
 * - Remove action markers like *smiles*
 * - Remove excessive punctuation
 * - Handle emojis
 */
function cleanTextForTTS(text: string): string {
  return (
    text
      // Remove action markers (text between asterisks)
      .replace(/\*[^*]+\*/g, "")
      // Remove emojis (basic range)
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ""
      )
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
      // Replace excessive punctuation
      .replace(/([!?.])\1+/g, "$1")
      // Trim whitespace
      .trim()
  );
}
