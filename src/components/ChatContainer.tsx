"use client";

import { useState, useCallback } from "react";
import { ChatForm } from "./ChatForm";
import { ChatMessages } from "./ChatMessages";
import type { Message } from "@/types/prisma";
import type { StreamState } from "@/types/workflow";

export function ChatContainer({
  initialMessages,
  companionId,
  companionName
}: {
  initialMessages: Message[];
  companionId: string;
  companionName: string;
}) {
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);

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

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col-reverse">
        <ChatMessages
          initialMessages={initialMessages}
          companionId={companionId}
          streamState={streamState}
          optimisticMessage={optimisticMessage}
        />
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <ChatForm
          companionId={companionId}
          companionName={companionName}
          onStreamUpdate={handleStreamUpdate}
          onMessageSent={handleMessageSent}
          onWorkflowComplete={handleWorkflowComplete}
        />
      </div>
    </>
  );
}
