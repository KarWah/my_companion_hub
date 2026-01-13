"use client";

import { Plus, Sparkles } from "lucide-react";
import { EthnicitySection } from "./EthnicitySection";
import { ColorSelectionGrid, ImageSelectionGrid } from "../components";
import {
  SKIN_TONES,
  HAIR_PRIMARY_STYLES,
  HAIR_MODIFIERS,
  HAIR_TEXTURES,
  HAIR_COLORS,
  EYE_COLORS,
} from "../constants";

interface LookStepProps {
  ethnicity: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  hairPrimary: string;
  hairModifier: string;
  hairTexture: string;
  customHairColorText: string;
  onEthnicityChange: (ethnicity: string) => void;
  onSkinToneChange: (skinTone: string) => void;
  onEyeColorChange: (eyeColor: string) => void;
  onHairPrimarySelect: (id: string) => void;
  onHairModifierSelect: (id: string) => void;
  onHairTextureSelect: (id: string) => void;
  onHairColorSelect: (id: string) => void;
  onCustomHairColorChange: (text: string) => void;
}

export function LookStep({
  ethnicity,
  skinTone,
  hairStyle,
  hairColor,
  eyeColor,
  hairPrimary,
  hairModifier,
  hairTexture,
  customHairColorText,
  onEthnicityChange,
  onSkinToneChange,
  onEyeColorChange,
  onHairPrimarySelect,
  onHairModifierSelect,
  onHairTextureSelect,
  onHairColorSelect,
  onCustomHairColorChange,
}: LookStepProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <EthnicitySection ethnicity={ethnicity} onChange={onEthnicityChange} />

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Skin Tone</h3>
        </div>
        <ColorSelectionGrid
          options={SKIN_TONES}
          selectedId={skinTone}
          onSelect={(val: string) => onSkinToneChange(val)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Hair Base Style</h3>
        </div>
        <ImageSelectionGrid
          options={HAIR_PRIMARY_STYLES}
          selectedId={hairPrimary}
          onSelect={onHairPrimarySelect}
          allowCustom={false}
          aspectRatio="aspect-square"
        />
      </div>

      <div className="pl-6 border-l-2 border-purple-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Style Modifier (Choose One)</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {HAIR_MODIFIERS.map((modifier) => (
            <button
              key={modifier.id}
              type="button"
              onClick={() => onHairModifierSelect(modifier.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg border-2 transition-[background-color,border-color] ${
                hairModifier === modifier.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {modifier.img && (
                <img
                  src={modifier.img}
                  alt={modifier.label}
                  loading="lazy"
                  className="w-20 h-20 rounded object-cover"
                />
              )}
              <span className={`text-xs font-bold ${hairModifier === modifier.id ? 'text-purple-400' : 'text-slate-400'}`}>
                {modifier.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pl-6 border-l-2 border-pink-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-pink-400" />
          <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider">Hair Texture (Optional)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {HAIR_TEXTURES.map((texture) => (
            <button
              key={texture.id}
              type="button"
              onClick={() => onHairTextureSelect(texture.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-[background-color,border-color,color] ${
                hairTexture === texture.id
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {texture.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Combined: <span className="text-pink-400 font-mono">{hairStyle}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Hair Color</h3>
        </div>
        <ImageSelectionGrid
          options={HAIR_COLORS}
          selectedId={HAIR_COLORS.find(c => c.id === hairColor)?.id || 'custom'}
          onSelect={onHairColorSelect}
          allowCustom={true}
          customValue={customHairColorText}
          onCustomChange={onCustomHairColorChange}
          customLabel="Describe Hair Color"
          customPlaceholder="e.g. Silver with purple highlights, ombre pink to blue..."
          aspectRatio="aspect-square"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Eyes</h3>
        </div>
        <ColorSelectionGrid
          options={EYE_COLORS}
          selectedId={eyeColor}
          onSelect={(id: string) => onEyeColorChange(id)}
        />
      </div>
    </div>
  );
}
