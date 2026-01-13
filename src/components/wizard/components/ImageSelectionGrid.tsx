"use client";

import { useState } from "react";
import { Check, Edit3 } from "lucide-react";
import type { ImageSelectionGridProps } from "../types";
import { NeonInput } from "./NeonInput";

export function ImageSelectionGrid({
  options,
  selectedId,
  onSelect,
  aspectRatio = "aspect-[3/4]",
  allowCustom = false,
  customValue = "",
  onCustomChange,
  customPlaceholder = "Describe custom option...",
  customLabel = "Describe Custom Style"
}: ImageSelectionGridProps) {
  const [showCustomInput, setShowCustomInput] = useState(allowCustom && selectedId === 'custom');

  const handleSelect = (id: string) => {
    if (id === 'custom') {
      setShowCustomInput(true);
      onSelect('custom');
    } else {
      setShowCustomInput(false);
      onSelect(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3" role="radiogroup" aria-label="Select style option" style={{ willChange: 'transform' }}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.label}
              onClick={() => handleSelect(opt.id)}
              className={`
                group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-[border-color,transform,opacity,box-shadow] duration-200
                ${isSelected
                  ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-500 scale-[1.02]'
                  : 'border-slate-800 hover:border-slate-500 opacity-80 hover:opacity-100'
                }
                ${aspectRatio}
              `}
            >
              <div className="absolute inset-0 bg-slate-800">
                <img
                  src={opt.img}
                  alt={opt.label}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-0.5 shadow-lg animate-in zoom-in duration-200" aria-hidden="true">
                  <Check size={10} strokeWidth={4} />
                </div>
              )}
            </button>
          );
        })}

        {allowCustom && (
          <button
            type="button"
            role="radio"
            aria-checked={selectedId === 'custom'}
            aria-label="Custom style option"
            onClick={() => handleSelect('custom')}
            className={`
              group relative cursor-pointer rounded-xl overflow-hidden border-2 border-dashed transition-[border-color,color] duration-200 flex flex-col items-center justify-center bg-slate-900/50
              ${selectedId === 'custom' ? 'border-pink-500 text-pink-500' : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}
              ${aspectRatio}
            `}
          >
            <Edit3 size={24} className="mb-2" />
            <span className="text-[10px] font-bold uppercase">Custom</span>
          </button>
        )}
      </div>

      {allowCustom && showCustomInput && selectedId === 'custom' && (
        <div className="animate-in slide-in-from-top-2 fade-in">
          <NeonInput
            label={customLabel}
            value={customValue}
            onChange={(e) => onCustomChange && onCustomChange(e.target.value)}
            placeholder={customPlaceholder}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
