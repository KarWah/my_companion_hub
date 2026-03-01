/**
 * ElevenLabs TTS Integration
 *
 * Uses the ElevenLabs API for text-to-speech generation.
 * Free tier supports limited characters per month.
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ElevenLabsVoice, VoiceSettings } from "@/types";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// Default voice settings for natural-sounding speech
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// Curated list of free-tier voices that work well for companions
// Preview URLs are from ElevenLabs public CDN
export const RECOMMENDED_VOICES = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Warm, calm female voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    description: "Strong, expressive female voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/508e12d0-a7f7-4d86-a0d3-f3884ff353ed.mp3",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    description: "Soft, gentle female voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/53bd2f5f-bb59-4146-8822-245b2a466c80.mp3",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    description: "Youthful, energetic female voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/d42a5016-511d-4a14-b9c8-6234cc56a90d.mp3",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    description: "Deep, masculine male voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/3ae2fc71-d5f9-4769-bb71-2a43633cd186.mp3",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    description: "Strong, authoritative male voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4xSOukaG/316050b7-c4e0-48de-acf9-a882bb7fc43b.mp3",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Warm, friendly male voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/38a69695-2ca9-4b9e-b9ec-f07ced494a58.mp3",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    description: "Neutral, versatile male voice",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/yoZ06aMxZJJ28mfd3POQ/ac9d1c91-92ce-4b20-8cc2-3187a7da49ec.mp3",
  },
];

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return Boolean(env.ELEVENLABS_API_KEY);
}

/**
 * Get available voices from ElevenLabs API
 */
export async function getVoices(): Promise<ElevenLabsVoice[]> {
  if (!isElevenLabsConfigured()) {
    logger.warn("ElevenLabs API key not configured");
    return [];
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    logger.error({ error }, "Failed to fetch ElevenLabs voices");
    return [];
  }
}

/**
 * Generate speech from text using ElevenLabs
 *
 * @param voiceId - ElevenLabs voice ID
 * @param text - Text to convert to speech
 * @param settings - Optional voice settings
 * @returns ArrayBuffer containing audio data (mp3)
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  settings?: Partial<VoiceSettings>
): Promise<ArrayBuffer> {
  if (!isElevenLabsConfigured()) {
    throw new Error("ElevenLabs API key not configured");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for speech generation");
  }

  // Limit text length to avoid excessive API usage
  const maxChars = 5000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

  const voiceSettings = {
    ...DEFAULT_VOICE_SETTINGS,
    ...settings,
  };

  logger.info(
    { voiceId, textLength: truncatedText.length },
    "Generating speech with ElevenLabs"
  );

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: "eleven_multilingual_v2", // Free tier compatible
        voice_settings: {
          stability: voiceSettings.stability,
          similarity_boost: voiceSettings.similarity_boost,
          style: voiceSettings.style,
          use_speaker_boost: voiceSettings.use_speaker_boost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText },
      "ElevenLabs API error"
    );

    // Handle specific error codes
    if (response.status === 401) {
      throw new Error("ElevenLabs API key is invalid");
    }
    if (response.status === 429) {
      throw new Error("ElevenLabs rate limit exceeded. Try again later.");
    }
    if (response.status === 400) {
      throw new Error("Invalid request to ElevenLabs API");
    }

    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();

  logger.info(
    { voiceId, audioSize: audioBuffer.byteLength },
    "Speech generated successfully"
  );

  return audioBuffer;
}

/**
 * Get voice preview URL for a specific voice
 */
export function getVoicePreviewUrl(voiceId: string): string {
  const voice = RECOMMENDED_VOICES.find((v) => v.id === voiceId);
  if (voice) {
    return voice.previewUrl;
  }
  return "";
}

/**
 * Validate a voice ID exists
 */
export async function validateVoiceId(voiceId: string): Promise<boolean> {
  if (!isElevenLabsConfigured()) {
    return false;
  }

  // Check recommended voices first (no API call needed)
  if (RECOMMENDED_VOICES.some((v) => v.id === voiceId)) {
    return true;
  }

  // Otherwise, check against full voice list
  try {
    const voices = await getVoices();
    return voices.some((v) => v.voice_id === voiceId);
  } catch {
    return false;
  }
}
