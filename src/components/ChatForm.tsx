"use client";

import { Send, Image as ImageIcon } from "lucide-react";
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
  onStreamUpdate,
  onMessageSent,
  onWorkflowComplete
}: {
  companionId: string;
  companionName: string;
  onStreamUpdate?: (state: StreamState) => void;
  onMessageSent?: (message: string) => void;
  onWorkflowComplete?: () => void;
}) {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const streamState = useWorkflowStream(workflowId);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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

    // Show optimistic message immediately
    if (message && onMessageSent) {
      onMessageSent(message);
    }

    const result = await sendMessage(formData);
    if (result?.success && result.workflowId) {
      setWorkflowId(result.workflowId);
    } else if (result?.error) {
      alert(result.error);
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

      {/* Progress UI */}
      {workflowId && !streamState.isComplete && (
        <div className="mt-2 p-3 bg-slate-800/80 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">{streamState.currentStep}</span>
            <span className="text-xs text-slate-400">{streamState.progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${streamState.progress}%` }}
            />
          </div>
        </div>
      )}

      {streamState.error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          Error: {streamState.error}
        </div>
      )}
    </div>
  );
}
