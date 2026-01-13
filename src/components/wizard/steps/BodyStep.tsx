"use client";

import { ImageSelectionGrid } from "../components";
import { BODY_TYPES, BREAST_SIZES, BUTT_SIZES } from "../constants";

interface BodyStepProps {
  bodyType: string;
  breastSize: string;
  buttSize: string;
  onBodyTypeChange: (bodyType: string) => void;
  onBreastSizeChange: (size: string) => void;
  onButtSizeChange: (size: string) => void;
}

export function BodyStep({
  bodyType,
  breastSize,
  buttSize,
  onBodyTypeChange,
  onBreastSizeChange,
  onButtSizeChange,
}: BodyStepProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Body Type</h3>
        </div>
        <ImageSelectionGrid
          options={BODY_TYPES}
          selectedId={bodyType}
          onSelect={(id: string) => onBodyTypeChange(id)}
          aspectRatio="aspect-[2/3]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Breast Size</label>
          <div className="grid grid-cols-3 gap-2">
            {BREAST_SIZES.map(size => (
              <button
                key={size}
                onClick={() => onBreastSizeChange(size)}
                className={`py-3 rounded-lg text-xs font-bold uppercase border transition-[background-color,border-color,color] ${
                  breastSize === size
                    ? 'bg-pink-500 border-pink-500 text-white'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Butt Size</label>
          <div className="grid grid-cols-2 gap-2">
            {BUTT_SIZES.map(size => (
              <button
                key={size}
                onClick={() => onButtSizeChange(size)}
                className={`py-3 rounded-lg text-xs font-bold uppercase border transition-[background-color,border-color,color] ${
                  buttSize === size
                    ? 'bg-pink-500 border-pink-500 text-white'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
