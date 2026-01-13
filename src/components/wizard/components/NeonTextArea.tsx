"use client";

import type { NeonTextAreaProps } from "../types";

export function NeonTextArea({ label, ...props }: NeonTextAreaProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
      <textarea
        {...props}
        rows={3}
        className="w-full bg-black/40 border border-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 rounded-xl p-3.5 text-white outline-none transition-[border-color,box-shadow] placeholder:text-slate-700 resize-none text-sm leading-relaxed"
      />
    </div>
  );
}
