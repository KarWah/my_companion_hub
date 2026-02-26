"use client";

import { Send, Image as ImageIcon, Volume2, VolumeX } from "lucide-react";
import { useFormStatus } from "react-dom";
import { sendMessage, finalizeMessage } from "@/app/chat-actions";
import { useState, useEffect, useTransition, useRef } from "react";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import type { StreamState } from "@/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-glow-pink text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <div className="animate-spin h-[18px] w-[18px] border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <Send size={18} />
      )}
    </button>
  );
}

export function ChatForm({
  companionId,
  companionName,
  companionVoiceEnabled = false,
  companionVoiceId,
  onStreamUpdate,
  onMessageSent,
  onWorkflowComplete,
  onMessageFailed
}: {
  companionId: string;
  companionName: string;
  companionVoiceEnabled?: boolean;
  companionVoiceId?: string | null;
  onStreamUpdate?: (state: StreamState) => void;
  onMessageSent?: (message: string) => void;
  onWorkflowComplete?: () => void;
  onMessageFailed?: () => void;
}) {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const streamState = useWorkflowStream(workflowId);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  // Voice toggle - persisted per companion in localStorage
  const [voiceEnabled, setVoiceEnabled] = useState(companionVoiceEnabled);
  // Global AI settings - persisted in localStorage, configured in /settings
  const [ragEnabled, setRagEnabled] = useState(true);
  const [deepThink, setDeepThink] = useState(false);

  // On mount (or companion change), load persisted preferences from localStorage.
  useEffect(() => {
    const storedVoice = localStorage.getItem(`voice-${companionId}`);
    setVoiceEnabled(storedVoice !== null ? storedVoice === 'true' : companionVoiceEnabled);

    const storedRag = localStorage.getItem('rag-enabled');
    const storedDeepThink = localStorage.getItem('deep-think-enabled');
    if (storedRag !== null) setRagEnabled(storedRag === 'true');
    if (storedDeepThink !== null) setDeepThink(storedDeepThink === 'true');
  }, [companionId, companionVoiceEnabled]);

  const handleVoiceToggle = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem(`voice-${companionId}`, String(next));
  };

  // Forward stream updates to parent
  useEffect(() => {
    if (onStreamUpdate) {
      onStreamUpdate(streamState);
    }
  }, [streamState, onStreamUpdate]);

  // Finalize when complete
  useEffect(() => {
    if (streamState.isComplete && workflowId && !streamState.error) {
      startTransition(async () => {
        await finalizeMessage(workflowId);
        setWorkflowId(null);
        // Reset form
        formRef.current?.reset();
        // Notify parent that workflow is complete
        if (onWorkflowComplete) {
          onWorkflowComplete();
        }
      });
    }
  }, [streamState.isComplete, workflowId, streamState.error, onWorkflowComplete]);

  async function handleSubmit(formData: FormData) {
    const message = formData.get("message") as string;
    setSendError(null);

    // Show optimistic message immediately
    if (message && onMessageSent) {
      onMessageSent(message);
    }

    const result = await sendMessage(formData);
    if (result?.success && result.workflowId) {
      setWorkflowId(result.workflowId);
    } else if (result?.error) {
      setSendError(result.error);
      if (onMessageFailed) {
        onMessageFailed();
      }
    }
  }

  return (
    <div>
      <form
        ref={formRef}
        action={handleSubmit}
        className="flex gap-2 items-center bg-slate-800/50 p-2 rounded-2xl border border-slate-700 focus-within:border-pink-500 focus-within:shadow-glow-pink transition-all"
      >
        <input type="hidden" name="companionId" value={companionId} />
        <input type="hidden" name="voiceEnabled" value={voiceEnabled ? "true" : "false"} />
        <input type="hidden" name="ragEnabled" value={ragEnabled ? "true" : "false"} />
        <input type="hidden" name="deepThink" value={deepThink ? "true" : "false"} />
        {companionVoiceId && <input type="hidden" name="voiceId" value={companionVoiceId} />}

        {/* Voice toggle - only show if companion has voice configured */}
        {companionVoiceId && (
          <div className="relative group">
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-2 transition-colors ${
                voiceEnabled ? "text-pink-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <span className="absolute -top-8 left-0 text-xs bg-black text-white p-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {voiceEnabled ? "Voice on" : "Voice off"}
            </span>
          </div>
        )}

        <div className="relative group">
          <input type="checkbox" name="generateImage" id="genImg" className="peer sr-only" />
          <label htmlFor="genImg" className="p-2 text-slate-400 peer-checked:text-pink-400 hover:text-white cursor-pointer transition-colors">
            <ImageIcon size={20} />
          </label>
          <span className="absolute -top-8 left-0 text-xs bg-black text-white p-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
            Check to force image
          </span>
        </div>

        <input
          name="message"
          className="flex-1 bg-transparent border-none focus:outline-none text-white px-2"
          placeholder={`Message ${companionName}...`}
          autoComplete="off"
          required
          disabled={!!workflowId && !streamState.isComplete}
        />

        <SubmitButton />
      </form>

      {(sendError || streamState.error) && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          {sendError || `Error: ${streamState.error}`}
        </div>
      )}
    </div>
  );
}
