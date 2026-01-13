"use client";

import { useState } from "react";
import { Edit3, X } from "lucide-react";
import type { SelectWithCustomProps } from "../types";

export function SelectWithCustom({ label, options, value, onChange }: SelectWithCustomProps) {
  const [isCustom, setIsCustom] = useState(!options.includes(value) && value !== "");

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
      {!isCustom ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
          {options.map((opt: string) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={value === opt}
              onClick={() => onChange(opt)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-[background-color,border-color,color] ${
                value === opt
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setIsCustom(true);
              onChange("");
            }}
            className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-dashed border-slate-700 text-slate-600 hover:text-pink-400 flex items-center gap-1"
          >
            Custom <Edit3 size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type custom ${label}...`}
            className="w-full bg-slate-900/80 border-2 border-pink-500/50 rounded-xl p-3 pr-10 text-white outline-none text-sm"
            aria-label={`Custom ${label}`}
          />
          <button
            type="button"
            onClick={() => setIsCustom(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white bg-slate-800 rounded-full p-1"
            aria-label="Cancel custom input"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
