import { NextRequest, NextResponse } from "next/server";
import { RECOMMENDED_VOICES } from "@/lib/elevenlabs";

/**
 * Voice Preview API Route
 * Proxies audio from ElevenLabs CDN to avoid CORS issues
 */
export async function GET(request: NextRequest) {
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
    console.error("Voice preview fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio" },
      { status: 500 }
    );
  }
}
