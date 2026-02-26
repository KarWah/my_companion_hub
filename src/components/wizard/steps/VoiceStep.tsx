"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Play, Pause, Check, Mic } from "lucide-react";
import { RECOMMENDED_VOICES } from "@/lib/elevenlabs";

interface VoiceStepProps {
  voiceId: string | null;
  voiceEnabled: boolean;
  onVoiceIdChange: (voiceId: string | null) => void;
  onVoiceEnabledChange: (enabled: boolean) => void;
}

export function VoiceStep({
  voiceId,
  voiceEnabled,
  onVoiceIdChange,
  onVoiceEnabledChange,
}: VoiceStepProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playPreview = async (voice: typeof RECOMMENDED_VOICES[number]) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice.id);

    try {
      // Use local API proxy to avoid CORS issues
      const audio = new Audio(`/api/voice/preview?voiceId=${voice.id}`);
      audioRef.current = audio;

      // Handle audio end
      audio.onended = () => {
        setPlayingVoice(null);
        audioRef.current = null;
      };

      // Handle audio error
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setPlayingVoice(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Failed to play preview:", error);
      setPlayingVoice(null);
      audioRef.current = null;
    }
  };

  const handleVoiceSelect = (id: string) => {
    if (voiceId === id) {
      // Deselect if clicking the same voice
      onVoiceIdChange(null);
      onVoiceEnabledChange(false);
    } else {
      onVoiceIdChange(id);
      onVoiceEnabledChange(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Voice Selection</h2>
        <p className="text-slate-400">
          Give your companion a voice! Select a voice style for text-to-speech messages.
        </p>
      </div>

      {/* Voice Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-pink-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400" />
          )}
          <div>
            <div className="font-medium text-white">Enable Voice</div>
            <div className="text-sm text-slate-400">
              Your companion will speak their messages aloud
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const newEnabled = !voiceEnabled;
            onVoiceEnabledChange(newEnabled);
            if (!newEnabled) {
              onVoiceIdChange(null);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            voiceEnabled ? "bg-pink-600" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              voiceEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Voice Selection Grid */}
      {voiceEnabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-slate-300">Select a Voice</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {RECOMMENDED_VOICES.map((voice) => {
              const isSelected = voiceId === voice.id;
              const isPlaying = playingVoice === voice.id;

              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => handleVoiceSelect(voice.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/50"
                      : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-pink-400" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-pink-600/20 text-pink-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{voice.name}</div>
                      <div className="text-xs text-slate-400 truncate">{voice.description}</div>
                    </div>
                  </div>

                  {/* Preview Button - using div with role="button" to avoid nested button issue */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(voice);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        playPreview(voice);
                      }
                    }}
                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isPlaying
                        ? "bg-pink-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Preview
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Voice generation uses ElevenLabs. You can toggle voice on/off in the chat window.
          </p>
        </div>
      )}

      {/* No voice message */}
      {!voiceEnabled && (
        <div className="text-center py-8 text-slate-500">
          <VolumeX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Voice is disabled. Your companion will only send text messages.</p>
          <p className="text-sm mt-1">You can enable voice at any time.</p>
        </div>
      )}
    </div>
  );
}
