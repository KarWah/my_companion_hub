"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MessageCircle } from "lucide-react";
import { clonePublicCompanion } from "@/app/actions";
import type { PublicCompanion } from "@/types";

interface CloneCompanionButtonProps {
  companion: PublicCompanion;
}

export function CloneCompanionButton({ companion }: CloneCompanionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClone = () => {
    setError(null);

    startTransition(async () => {
      const result = await clonePublicCompanion(companion.id);

      if (result.success && result.data) {
        // Redirect to chat with the new companion
        router.push(`/?companion=${result.data.id}`);
      } else {
        setError(result.error || "Failed to add companion");
      }
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleClone}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-900/30"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Adding to your companions...
          </>
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            Chat with {companion.name}
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        This will create a copy of {companion.name} in your companions list.
      </p>
    </div>
  );
}
