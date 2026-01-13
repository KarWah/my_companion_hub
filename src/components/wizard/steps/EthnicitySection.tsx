"use client";

import { Sparkles } from "lucide-react";
import { REAL_ETHNICITIES, FANTASY_RACES } from "../constants";
import { ImageSelectionGrid } from "../components";

interface EthnicitySectionProps {
  ethnicity: string;
  onChange: (ethnicity: string) => void;
}

export function EthnicitySection({ ethnicity, onChange }: EthnicitySectionProps) {
  const isFantasySelected = FANTASY_RACES.some(r => r.id === ethnicity) || ethnicity === 'fantasy';

  return (
    <div className="space-y-4 animate-in fade-in">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ethnicity</h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {REAL_ETHNICITIES.map((opt) => (
          <div
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-[border-color,transform,opacity,box-shadow] duration-300 aspect-square
              ${ethnicity === opt.id
                ? 'border-pink-500 shadow-lg ring-1 ring-pink-500 scale-[1.02]'
                : 'border-slate-800 hover:border-slate-500 opacity-80 hover:opacity-100'
              }
            `}
          >
            <img src={opt.img} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-2 text-center bg-black/60">
              <span className={`text-[10px] font-bold uppercase ${ethnicity === opt.id ? 'text-white' : 'text-slate-300'}`}>{opt.label}</span>
            </div>
          </div>
        ))}

        <div
          onClick={() => onChange('elf')}
          className={`
            group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-[border-color,box-shadow] duration-300 aspect-square flex flex-col items-center justify-center bg-slate-900
            ${isFantasySelected
              ? 'border-purple-500 shadow-lg ring-1 ring-purple-500'
              : 'border-slate-800 hover:border-slate-500'
            }
          `}
        >
          <Sparkles size={32} className={isFantasySelected ? 'text-purple-400' : 'text-slate-600'} />
          <span className={`mt-2 text-[10px] font-bold uppercase ${isFantasySelected ? 'text-purple-400' : 'text-slate-500'}`}>Fantasy</span>
        </div>
      </div>

      {isFantasySelected && (
        <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 animate-in slide-in-from-top-2">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Sparkles size={12} /> Choose Species</h4>
          <ImageSelectionGrid
            options={FANTASY_RACES}
            selectedId={ethnicity}
            onSelect={(id: string) => onChange(id)}
            aspectRatio="aspect-square"
          />
        </div>
      )}
    </div>
  );
}
