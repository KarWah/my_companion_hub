"use client";

import type { Message, StreamState } from "@/types";

export function ChatMessages({
  initialMessages,
  companionId,
  streamState,
  optimisticMessage
}: {
  initialMessages: Message[];
  companionId: string;
  streamState?: StreamState;
  optimisticMessage?: string | null;
}) {
  const isStreaming = streamState && !streamState.isComplete;
  const streamingText = streamState?.streamedText || '';
  const streamingImageUrl = streamState?.imageUrl || null;

  // Check if the optimistic message already exists in the real messages
  const lastMessage = initialMessages[initialMessages.length - 1];
  const shouldShowOptimistic = optimisticMessage &&
    (!lastMessage || lastMessage.content !== optimisticMessage || lastMessage.role !== "user");

  return (
    <div className="flex flex-col gap-4 justify-end min-h-0">
      {initialMessages.map((msg: Message) => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[80%] space-y-2">
            <div className={`p-4 rounded-3xl ${
              msg.role === "user"
                ? "bg-gradient-to-br from-pink-600 to-purple-600 shadow-lg text-white rounded-tr-sm"
                : "bg-gradient-to-br from-slate-800/90 to-purple-950/30 shadow-md text-slate-200 rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
            {msg.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-700">
                <img src={msg.imageUrl} alt="Generated" className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Optimistic user message - only show if not already in real messages */}
      {shouldShowOptimistic && (
        <div className="flex justify-end">
          <div className="max-w-[80%]">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-pink-600 to-purple-600 shadow-lg text-white rounded-tr-sm opacity-80">
              {optimisticMessage}
            </div>
          </div>
        </div>
      )}

      {/* Streaming assistant message */}
      {isStreaming && streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-2">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-800/90 to-purple-950/30 shadow-md text-slate-200 rounded-tl-sm">
              {streamingText}
              <span className="inline-block w-1 h-4 ml-1 bg-pink-400 animate-pulse" />
            </div>
            {/* Show image placeholder or loading state */}
            {streamingImageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-700">
                <img src={streamingImageUrl} alt="Generated" className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
