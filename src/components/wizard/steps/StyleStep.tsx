"use client";

import { Check } from "lucide-react";

interface StyleStepProps {
  style: string;
  onStyleChange: (style: string) => void;
}

export function StyleStep({ style, onStyleChange }: StyleStepProps) {
  return (
    <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-xl md:text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-6">CHOOSE ART STYLE</h2>
      <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
        {['anime', 'realistic'].map((styleOption) => (
          <div
            key={styleOption}
            onClick={() => onStyleChange(styleOption)}
            className={`cursor-pointer rounded-2xl border-2 overflow-hidden relative aspect-[3/4] group transition-[border-color,transform,opacity,box-shadow] duration-300 ${
              style === styleOption
                ? 'border-pink-500 scale-105 shadow-xl shadow-pink-500/20'
                : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }`}
          >
            <img
              src={`/assets/styles/${styleOption}.jpg`}
              className="w-full h-full object-cover"
              onError={(e: any) => e.target.style.display = 'none'}
              alt={styleOption}
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-lg font-bold uppercase tracking-widest text-white">{styleOption}</span>
            </div>
            {style === styleOption && (
              <div className="absolute top-3 right-3 bg-pink-500 rounded-full p-1">
                <Check size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
