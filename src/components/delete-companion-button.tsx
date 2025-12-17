"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCompanion } from "@/app/actions";
import { useRouter } from "next/navigation";

export function DeleteCompanionButton({ companionId }: { companionId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCompanion(companionId);
      if (result.success) {
        setShowConfirm(false);
        router.refresh();
      } else {
        alert(result.error || "Failed to delete companion");
      }
    });
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors"
        title="Delete Companion"
        type="button"
      >
        <Trash2 size={18} />
      </button>
    );
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-xs rounded transition-colors"
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
  );
}
