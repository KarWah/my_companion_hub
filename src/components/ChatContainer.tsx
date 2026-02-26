"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChatForm } from "./ChatForm";
import { ChatMessages } from "./ChatMessages";
import type { Message, StreamState } from "@/types";

export function ChatContainer({
  initialMessages,
  companionId,
  companionName,
  companionVoiceEnabled = false,
  companionVoiceId
}: {
  initialMessages: Message[];
  companionId: string;
  companionName: string;
  companionVoiceEnabled?: boolean;
  companionVoiceId?: string | null;
}) {
  const [streamState, setStreamState] = useState<StreamState | undefined>(undefined);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives.
  // With flex-col-reverse the "bottom" (newest messages) is scrollTop=0.
  // Only scroll if the user is already near the bottom (< 150px scrolled up).
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 150) {
      container.scrollTop = 0;
    }
  }, [streamState, optimisticMessage]);

  const handleStreamUpdate = useCallback((state: StreamState) => {
    setStreamState(state);
    // Don't clear optimistic message - let it stay visible
    // It will be replaced by the real message when the page revalidates
  }, []);

  const handleMessageSent = useCallback((message: string) => {
    // Show user message immediately
    setOptimisticMessage(message);
  }, []);

  const handleWorkflowComplete = useCallback(() => {
    // Clear optimistic message immediately when workflow completes
    // The real message will already be in the DB from finalizeMessage
    setOptimisticMessage(null);
  }, []);

  const handleMessageFailed = useCallback(() => {
    // Clear ghost optimistic message on send failure
    setOptimisticMessage(null);
  }, []);

  return (
    <>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col-reverse">
        <ChatMessages
          initialMessages={initialMessages}
          companionId={companionId}
          companionName={companionName}
          streamState={streamState}
          optimisticMessage={optimisticMessage}
        />
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <ChatForm
          companionId={companionId}
          companionName={companionName}
          companionVoiceEnabled={companionVoiceEnabled}
          companionVoiceId={companionVoiceId}
          onStreamUpdate={handleStreamUpdate}
          onMessageSent={handleMessageSent}
          onWorkflowComplete={handleWorkflowComplete}
          onMessageFailed={handleMessageFailed}
        />
      </div>
    </>
  );
}
