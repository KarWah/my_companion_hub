"use client";

import type { ColorSelectionGridProps } from "../types";

export function ColorSelectionGrid({ options, selectedId, onSelect }: ColorSelectionGridProps) {
  return (
    <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Select color">
      {options.map((opt) => {
        const value = opt.id || opt.value;
        const isSelected = selectedId === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Select ${opt.label} color`}
            onClick={() => onSelect(value!)}
            className="group relative flex flex-col items-center gap-2"
            title={opt.label}
          >
            <div className={`
              w-12 h-12 rounded-full border-2 transition-[border-color,transform,box-shadow] duration-300 shadow-lg
              ${opt.color}
              ${isSelected
                ? 'border-pink-500 ring-2 ring-pink-500/30 scale-110'
                : 'border-slate-700 hover:scale-105'
              }
            `}>
              {opt.color.startsWith('#') && (
                <div className="w-full h-full rounded-full" style={{ backgroundColor: opt.color }} />
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-pink-400' : 'text-slate-500'}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
