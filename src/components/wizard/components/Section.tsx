"use client";

import type { SectionProps } from "../types";

export function Section({ title, icon: Icon, children, className = "" }: SectionProps) {
  return (
    <section className={`bg-slate-800/95 border border-slate-700 rounded-3xl p-6 shadow-xl ${className}`} style={{ contain: 'layout style paint' }}>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="p-2 bg-slate-800 rounded-lg text-pink-500">
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </section>
  );
}
