import { getActiveCompanion } from "@/app/actions";
import prisma from "@/lib/prisma";
import { ChatContainer } from "@/components/ChatContainer";
import { env } from "@/lib/env";
import type { Message } from "@/types/index";

const MOOD_EMOJI: Record<string, string> = {
  neutral: "😐", happy: "😊", playful: "😄", affectionate: "🥰",
  excited: "✨", flirty: "😘", melancholic: "😔", irritated: "😒",
  jealous: "😤", worried: "😟", embarrassed: "😳", aroused: "🔥",
};

function StatBar({ level }: { level: number }) {
  const filled = Math.round((level ?? 0) / 20);
  return (
    <span className="font-mono text-slate-300">
      {"█".repeat(filled)}{"░".repeat(5 - filled)} {level ?? 0}
    </span>
  );
}

function MoodDisplay({ companion }: { companion: Record<string, unknown> }) {
  const mood = (companion.currentMood as string) ?? "neutral";
  const affection = (companion.affectionLevel as number) ?? 0;
  const trust = (companion.trustLevel as number) ?? 0;
  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <span className="text-slate-500">Mood:</span>
        <span className="text-yellow-300">{MOOD_EMOJI[mood] ?? "😐"} {mood}</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-slate-500">Affection:</span>
        <span className="text-pink-300">❤ <StatBar level={affection} /></span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-slate-500">Trust:</span>
        <span className="text-blue-300">🤝 <StatBar level={trust} /></span>
      </div>
    </>
  );
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ companionId?: string }>;
}) {
  const params = await searchParams;
  const activeId = params?.companionId;
  const companion = await getActiveCompanion(activeId);

  if (!companion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
          <span className="text-4xl">💬</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No companion selected</h2>
        <p className="text-slate-400 mb-8 max-w-sm">
          Choose an existing companion or create a new one to start chatting.
        </p>
        <div className="flex gap-3">
          <a
            href="/companions"
            className="px-5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all"
          >
            My Companions
          </a>
          <a
            href="/companions/new"
            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Create New
          </a>
        </div>
      </div>
    );
  }

  // Optimized: Load only the most recent 100 messages
  // Get in descending order (newest first), then reverse for display
  const recentMessages = await prisma.message.findMany({
    where: { companionId: companion.id },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to 100 most recent messages for performance
  });

  // Reverse to display oldest-first (chronological order)
  // Cast role: Prisma returns string, but DB only ever contains "user" | "assistant"
  const messages = recentMessages.reverse().map(m => ({
    ...m,
    role: m.role as Message["role"],
  }));

  const hideImages = env.SFW_MODE && (companion.fetishes?.length ?? 0) > 0;

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
          <div className="border-t border-slate-700/50 my-1" />
          <MoodDisplay companion={companion} />
        </div>
      </div>

      <ChatContainer
        initialMessages={messages}
        companionId={companion.id}
        companionName={companion.name}
        companionVoiceEnabled={companion.voiceEnabled}
        companionVoiceId={companion.voiceId}
        hideImages={hideImages}
      />
    </div>
  );
}