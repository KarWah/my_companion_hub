"use client";

import { useState } from "react";
import { Hash, X } from "lucide-react";
import type { TagInputProps } from "../types";

export function TagInput({ label, values, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim() && !values.includes(input.trim())) {
        onChange([...values, input.trim()]);
        setInput("");
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-pink-500 uppercase tracking-wider ml-1 flex items-center gap-1">
        <Hash size={10} /> {label}
      </label>
      <div className="bg-black/40 border border-slate-800 focus-within:border-pink-500/50 rounded-xl p-2 flex flex-wrap gap-2 min-h-[50px]">
        {values.map((tag: string) => (
          <span key={tag} className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v: string) => v !== tag))}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ""}
          aria-label={label}
          className="flex-1 bg-transparent border-none outline-none text-white text-sm min-w-[120px] p-1.5"
        />
      </div>
    </div>
  );
}
