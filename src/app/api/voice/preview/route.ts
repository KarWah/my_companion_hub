import { NextRequest, NextResponse } from "next/server";
import { RECOMMENDED_VOICES } from "@/lib/elevenlabs";
import { apiLogger } from "@/lib/logger";
import { checkVoicePreviewRateLimit, getClientIp } from "@/lib/rate-limit-db";

/**
 * Voice Preview API Route
 * Proxies audio from ElevenLabs CDN to avoid CORS issues
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = await checkVoicePreviewRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const voiceId = request.nextUrl.searchParams.get("voiceId");

  if (!voiceId) {
    return NextResponse.json({ error: "voiceId required" }, { status: 400 });
  }

  const voice = RECOMMENDED_VOICES.find((v) => v.id === voiceId);
  if (!voice?.previewUrl) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 });
  }

  try {
    // Fetch audio from ElevenLabs CDN server-side
    const response = await fetch(voice.previewUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch audio" },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24h
      },
    });
  } catch (error) {
    apiLogger.error({ voiceId, error }, "Voice preview fetch error");
    return NextResponse.json(
      { error: "Failed to fetch audio" },
      { status: 500 }
    );
  }
}
