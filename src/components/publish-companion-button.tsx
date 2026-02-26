"use client";

import { Globe, GlobeLock } from "lucide-react";
import { useState, useTransition } from "react";
import { togglePublishCompanion } from "@/app/actions";
import { useRouter } from "next/navigation";

interface PublishCompanionButtonProps {
  companionId: string;
  isPublic: boolean;
}

export function PublishCompanionButton({
  companionId,
  isPublic
}: PublishCompanionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await togglePublishCompanion(companionId);
      if (result.success) {
        setShowConfirm(false);
        router.refresh();
      } else {
        alert(result.error || "Failed to update companion visibility");
      }
    });
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={`absolute top-3 right-3 flex items-center justify-center p-2 rounded-lg transition-all z-10 ${
          isPublic
            ? "bg-green-900/40 hover:bg-green-900/60 text-green-400"
            : "bg-slate-700/80 hover:bg-orange-900/40 text-slate-400 hover:text-orange-400"
        }`}
        title={isPublic ? "Published - Click to unpublish" : "Private - Click to publish"}
        type="button"
      >
        {isPublic ? <Globe size={18} /> : <GlobeLock size={18} />}
      </button>
    );
  }

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1 bg-slate-900/95 p-2 rounded-lg z-10 border border-slate-700">
      <p className="text-xs text-slate-300 mb-1">
        {isPublic ? "Make private?" : "Publish to Community?"}
      </p>
      <div className="flex gap-1">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`px-3 py-1 text-white text-xs rounded transition-colors ${
            isPublic
              ? "bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800"
              : "bg-green-600 hover:bg-green-500 disabled:bg-green-800"
          }`}
          type="button"
        >
          {isPending ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
          type="button"
        >
          No
        </button>
      </div>
    </div>
  );
}
