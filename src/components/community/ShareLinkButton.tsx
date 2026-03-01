"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function ShareLinkButton() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
    >
      {copied ? (
        <Check size={16} className="text-green-400" />
      ) : (
        <Link2 size={16} />
      )}
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
