"use client";

import { Send, Image as ImageIcon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { sendMessage } from "@/app/chat-actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <div className="animate-spin h-[18px] w-[18px] border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <Send size={18} />
      )}
    </button>
  );
}

export function ChatForm({ companionId, companionName }: { companionId: string; companionName: string }) {
  return (
    <form action={sendMessage} className="flex gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800 focus-within:border-blue-500 transition-colors">
      <input type="hidden" name="companionId" value={companionId} />

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
        placeholder={`Message ${companionName}...`}
        autoComplete="off"
        required
      />

      <SubmitButton />
    </form>
  );
}
