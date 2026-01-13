"use client";

import type { NeonInputProps } from "../types";

export function NeonInput({ label, ...props }: NeonInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
      <input
        {...props}
        className="w-full bg-black/40 border border-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 rounded-xl p-3.5 text-white outline-none transition-[border-color,box-shadow] placeholder:text-slate-700 text-sm"
      />
    </div>
  );
}
