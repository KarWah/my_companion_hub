import { getActiveCompanion } from "@/app/actions";
import { sendMessage } from "@/app/chat-actions";
import prisma from "@/lib/prisma";
import { Send, Image as ImageIcon } from "lucide-react";
import type { Message } from "@/types/prisma";

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
      <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-slate-300 overflow-hidden flex-shrink-0">
            {companion.headerImage ? (
              <img
                src={companion.headerImage}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col-reverse">
        <div className="flex flex-col gap-4 justify-end min-h-0">
           {messages.map((msg: Message) => (
               <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%] space-y-2">
                        <div className={`p-4 rounded-2xl ${
                            msg.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-slate-800 text-slate-200 rounded-tl-none"
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
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form action={sendMessage} className="flex gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800 focus-within:border-blue-500 transition-colors">
          
          <input type="hidden" name="companionId" value={companion.id} />
          
          <div className="relative group">
            <input type="checkbox" name="generateImage" id="genImg" className="peer sr-only" />
            <label htmlFor="genImg" className="p-2 text-slate-400 peer-checked:text-blue-400 hover:text-white cursor-pointer block">
                <ImageIcon size={20} />
            </label>
            <span className="absolute -top-8 left-0 text-xs bg-black text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Check to force image
            </span>
          </div>

          <input
            name="message"
            className="flex-1 bg-transparent border-none focus:outline-none text-white px-2"
            placeholder={`Message ${companion.name}...`}
            autoComplete="off"
            required
          />
          
          <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}