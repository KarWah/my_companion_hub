import { getActiveCompanion } from "@/app/actions";
import prisma from "@/lib/prisma";
import { ChatContainer } from "@/components/ChatContainer";
import type { Message } from "@/types/index";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { companionId?: string };
}) {
  const params = await searchParams;
  const activeId = params?.companionId;
  const companion = await getActiveCompanion(activeId);

  if (!companion) {
    return <div className="text-slate-500 p-10">No companion selected.</div>;
  }

  // Optimized: Load only the most recent 100 messages
  // Get in descending order (newest first), then reverse for display
  const recentMessages = await prisma.message.findMany({
    where: { companionId: companion.id },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to 100 most recent messages for performance
  });

  // Reverse to display oldest-first (chronological order)
  const messages = recentMessages.reverse();

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center text-slate-300 overflow-hidden flex-shrink-0">
            {companion.headerImageUrl ? (
              <img
                src={companion.headerImageUrl}
                alt={companion.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold">{companion.name[0]}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{companion.name}</h2>
            <p className="text-xs text-green-400 flex items-center gap-1">
               Online
            </p>
          </div>
        </div>

        <div className="text-xs space-y-1 text-right max-w-xs">
          <div className="flex items-center justify-end gap-2">
            <span className="text-slate-500">Wearing:</span>
            <span className="text-pink-300 truncate font-medium">
              {companion.currentOutfit}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-slate-500">Location:</span>
            <span className="text-purple-300 truncate">
              {companion.currentLocation}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-slate-500">Action:</span>
            <span className="text-blue-300 truncate">
              {companion.currentAction}
            </span>
          </div>
        </div>
      </div>

      <ChatContainer
        initialMessages={messages}
        companionId={companion.id}
        companionName={companion.name}
      />
    </div>
  );
}