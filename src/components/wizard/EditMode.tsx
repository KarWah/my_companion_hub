"use client";

import { Heart, Palette, Sparkles, Settings2, ChevronRight, Plus, X, Save, User } from "lucide-react";
import { ImageIcon } from "lucide-react";
import type { RefObject } from "react";
import type { CompanionWizardState } from "@/types";
import { ImageCropper } from "../image-cropper";
import {
  Section,
  NeonInput,
  NeonTextArea,
  TagInput,
  SelectWithCustom,
  ColorSelectionGrid,
  ImageSelectionGrid,
  ImageUpload,
} from "./components";
import { EthnicitySection } from "./steps";
import { PersonalityDepth } from "./PersonalityDepth";
import {
  OCCUPATIONS,
  HEIGHTS,
  RELATIONSHIPS,
  HOBBY_PRESETS,
  FETISH_PRESETS,
  CLOTHING_PRESETS,
  CLOTHING_CATEGORY_LABELS,
  CLOTHING_COLORS,
  SKIN_TONES,
  HAIR_PRIMARY_STYLES,
  HAIR_MODIFIERS,
  HAIR_TEXTURES,
  HAIR_COLORS,
  EYE_COLORS,
  BODY_TYPES,
  BREAST_SIZES,
  BUTT_SIZES,
} from "./constants";
import {
  getItemButtonClassesByColor,
  getCategoryHeaderClassesByColor,
  getSectionBadgeClassesByColor,
} from "./utils/color-helpers";

interface EditModeProps {
  state: CompanionWizardState;
  update: (field: keyof CompanionWizardState, value: any) => void;

  // Image upload
  imagePreview: string;
  showCropper: boolean;
  originalImage: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFile: (file: File) => void;
  setShowCropper: (show: boolean) => void;
  handleCropSave: (croppedImage: string) => void;

  // Hair state
  hairPrimary: string;
  hairModifier: string;
  hairTexture: string;
  customHairPrimary: string;
  customHairColorText: string;
  handleHairPrimarySelect: (id: string) => void;
  handleCustomHairPrimaryChange: (text: string) => void;
  handleHairModifierSelect: (id: string) => void;
  handleHairTextureSelect: (id: string) => void;
  handleHairColorSelect: (id: string) => void;
  handleCustomHairColorChange: (text: string) => void;

  // Hobbies and fetishes
  handleHobbyPresetToggle: (hobby: string) => void;
  handleFetishPresetToggle: (fetish: string) => void;

  // Clothing
  clothingSelections: Record<string, string>;
  handleClothingCategorySelect: (category: string, item: string) => void;
  handleClothingColorSelect: (category: string, color: string) => void;

  // Form submission
  isSubmitting: boolean;
  submitError: string | null;
  setSubmitError: (error: string | null) => void;
  handleSubmit: () => Promise<void>;
}

export function EditMode({
  state,
  update,
  imagePreview,
  showCropper,
  originalImage,
  fileInputRef,
  handleFile,
  setShowCropper,
  handleCropSave,
  hairPrimary,
  hairModifier,
  hairTexture,
  customHairPrimary,
  customHairColorText,
  handleHairPrimarySelect,
  handleCustomHairPrimaryChange,
  handleHairModifierSelect,
  handleHairTextureSelect,
  handleHairColorSelect,
  handleCustomHairColorChange,
  handleHobbyPresetToggle,
  handleFetishPresetToggle,
  clothingSelections,
  handleClothingCategorySelect,
  handleClothingColorSelect,
  isSubmitting,
  submitError,
  setSubmitError,
  handleSubmit,
}: EditModeProps) {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-32 px-4 md:px-6">

      {/* LEFT SIDEBAR (Sticky) */}
      <div className="lg:w-[320px] flex-shrink-0">
        <div className="lg:sticky lg:top-6 space-y-6">
          <Section title="Portrait" icon={ImageIcon} className="p-4">
            <ImageUpload
              imagePreview={imagePreview}
              fileInputRef={fileInputRef}
              mini={true}
              onFileSelect={handleFile}
              onCropClick={() => setShowCropper(true)}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {['anime', 'realistic'].map((style) => (
                <button
                  key={style}
                  onClick={() => update('style', style)}
                  className={`text-[10px] uppercase font-bold py-2 rounded-lg border transition-colors ${
                    state.style === style
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-slate-800 text-slate-500 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Quick Stats" icon={User} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Age</span>
                <span className="text-white font-mono">{state.age}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Height</span>
                <span className="text-white capitalize">{state.height}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Role</span>
                <span className="text-pink-400 font-bold">{state.occupation}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 space-y-8 min-w-0">

        {/* 1. IDENTITY */}
        <Section title="Core Identity" icon={Heart}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <NeonInput
                label="Full Name"
                value={state.name}
                onChange={(e: any) => update('name', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <NeonInput
                  label="Age"
                  type="number"
                  value={state.age}
                  onChange={(e: any) => update('age', parseInt(e.target.value))}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Height</label>
                  <select
                    value={state.height || 'average'}
                    onChange={(e) => update('height', e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl p-3.5 text-white text-sm"
                  >
                    {HEIGHTS.map(h => <option key={h} value={h.toLowerCase()}>{h}</option>)}
                  </select>
                </div>
              </div>
              <SelectWithCustom
                label="Occupation"
                options={OCCUPATIONS}
                value={state.occupation}
                onChange={(val: string) => update('occupation', val)}
              />
            </div>
            <div className="space-y-6">
              <SelectWithCustom
                label="Personality"
                options={['Adventurous', 'Shy', 'Dominant', 'Bratty', 'Motherly', 'Yandere']}
                value={state.personalityArchetype}
                onChange={(val: string) => update('personalityArchetype', val)}
              />
              <SelectWithCustom
                label="Relationship to You"
                options={RELATIONSHIPS}
                value={state.relationship}
                onChange={(val: string) => update('relationship', val)}
              />
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-pink-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Heart size={10} /> Hobbies & Interests
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {HOBBY_PRESETS.map((hobby) => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => handleHobbyPresetToggle(hobby)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-[background-color,border-color,color] ${
                        (state.hobbies || []).includes(hobby)
                          ? 'bg-pink-500 border-pink-500 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
                <TagInput
                  label="Custom Hobbies"
                  values={state.hobbies || []}
                  onChange={(vals: string[]) => update('hobbies', vals)}
                  placeholder="Type and press Enter..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Sparkles size={10} /> Fetishes & Kinks
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {FETISH_PRESETS.map((fetish) => (
                    <button
                      key={fetish}
                      type="button"
                      onClick={() => handleFetishPresetToggle(fetish)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-[background-color,border-color,color] ${
                        (state.fetishes || []).includes(fetish)
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {fetish}
                    </button>
                  ))}
                </div>
                <TagInput
                  label="Custom Fetishes"
                  values={state.fetishes || []}
                  onChange={(vals: string[]) => update('fetishes', vals)}
                  placeholder="Type and press Enter..."
                />
              </div>
            </div>
          </div>
        </Section>

        <PersonalityDepth state={state} onUpdate={update} />

        {/* CLOTHING & OUTFIT */}
        <Section title="Default Outfit" icon={Heart}>
          <div className="space-y-8">
            {/* Dynamic Categories with Per-Category Colors */}
            {Object.entries(CLOTHING_PRESETS).map(([category, items]) => {
              const categoryInfo = CLOTHING_CATEGORY_LABELS[category];
              const selectedItem = clothingSelections[category];
              const selectedColor = clothingSelections[`${category}Color`];

              return (
                <div key={category} className="space-y-3 pb-4 border-b border-slate-800 last:border-b-0">
                  {/* Section Label - changes color based on selected color */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded border transition-all ${getSectionBadgeClassesByColor(selectedColor)}`}>
                      {categoryInfo.section}
                    </div>
                  </div>

                  {/* Category Label & Color Selector */}
                  <div className="flex items-start justify-between gap-4">
                    <label className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${getCategoryHeaderClassesByColor(selectedColor)}`}>
                      {categoryInfo.label}
                    </label>

                    {/* Per-Category Color Selector */}
                    <div className="flex flex-wrap gap-1">
                      {CLOTHING_COLORS.map((colorOpt) => (
                        <button
                          key={colorOpt.id}
                          type="button"
                          onClick={() => handleClothingColorSelect(category, colorOpt.id)}
                          className={`w-6 h-6 rounded ${colorOpt.color} transition-[transform,opacity,box-shadow] ${
                            selectedColor === colorOpt.id
                              ? 'ring-2 ring-white scale-110'
                              : 'hover:scale-105 opacity-60 hover:opacity-100'
                          }`}
                          title={colorOpt.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Item Selection - uses dynamic color based on selected color */}
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleClothingCategorySelect(category, item)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${getItemButtonClassesByColor(selectedColor, selectedItem === item)}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Result Display */}
            <div className="space-y-2 pt-4 border-t-2 border-slate-700">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Final Outfit
              </label>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <p className="text-sm text-white font-mono">{state.defaultOutfit || 'None'}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* 2. APPEARANCE */}
        <Section title="Physical Appearance" icon={Palette}>
          <div className="space-y-8">

            <EthnicitySection
              ethnicity={state.ethnicity}
              onChange={(ethnicity: string) => update('ethnicity', ethnicity)}
            />

            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Skin Tone</h3>
              <ColorSelectionGrid
                options={SKIN_TONES}
                selectedId={state.skinTone}
                onSelect={(val: string) => update('skinTone', val)}
              />
            </div>

            <div className="border-t border-slate-800 pt-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hair Primary Style</h3>
                <ImageSelectionGrid
                  options={HAIR_PRIMARY_STYLES}
                  selectedId={hairPrimary}
                  onSelect={handleHairPrimarySelect}
                  allowCustom={true}
                  customValue={customHairPrimary}
                  onCustomChange={handleCustomHairPrimaryChange}
                  aspectRatio="aspect-square"
                />
              </div>

              <div className="pl-4 border-l-2 border-purple-500/30">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plus size={12} /> Style Modifier (Optional - Choose One)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {HAIR_MODIFIERS.map((modifier) => (
                    <button
                      key={modifier.id}
                      type="button"
                      onClick={() => handleHairModifierSelect(modifier.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-[background-color,border-color] ${
                        hairModifier === modifier.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {modifier.img && (
                        <img src={modifier.img} alt={modifier.label} className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className={`text-xs font-bold ${hairModifier === modifier.id ? 'text-purple-400' : 'text-slate-400'}`}>
                        {modifier.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pl-4 border-l-2 border-pink-500/30">
                <h3 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles size={12} /> Hair Texture (Optional)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {HAIR_TEXTURES.map((texture) => (
                    <button
                      key={texture.id}
                      type="button"
                      onClick={() => handleHairTextureSelect(texture.id)}
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
                <p className="text-xs text-slate-500 mt-2">
                  Combined: <span className="text-pink-400 font-mono">{state.hairStyle}</span>
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hair Color</h3>
                <ImageSelectionGrid
                  options={HAIR_COLORS}
                  selectedId={HAIR_COLORS.find(c => c.id === state.hairColor)?.id || 'custom'}
                  onSelect={handleHairColorSelect}
                  allowCustom={true}
                  customValue={customHairColorText}
                  onCustomChange={handleCustomHairColorChange}
                  customLabel="Describe Hair Color"
                  customPlaceholder="e.g. Silver with purple highlights, ombre pink to blue..."
                  aspectRatio="aspect-square"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Eye Color</h3>
              <ColorSelectionGrid
                options={EYE_COLORS}
                selectedId={state.eyeColor}
                onSelect={(id: string) => update('eyeColor', id)}
              />
            </div>
          </div>
        </Section>

        {/* 3. BODY */}
        <Section title="Body & Style" icon={Sparkles}>
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Body Type</h3>
              <ImageSelectionGrid
                options={BODY_TYPES}
                selectedId={state.bodyType}
                onSelect={(id: string) => update('bodyType', id)}
                aspectRatio="aspect-[2/3]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Breast Size</label>
                <div className="flex flex-wrap gap-2">
                  {BREAST_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => update('breastSize', size)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-[background-color,border-color,color] ${
                        state.breastSize === size
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
                <div className="flex flex-wrap gap-2">
                  {BUTT_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => update('buttSize', size)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-[background-color,border-color,color] ${
                        state.buttSize === size
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
        </Section>

        {/* 4. ADVANCED */}
        <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/95 shadow-xl" style={{ contain: 'layout style paint' }}>
          <details className="group">
            <summary className="flex items-center gap-2 p-6 cursor-pointer text-sm font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
              <Settings2 size={18} /> Advanced AI Tuning & Context
              <ChevronRight size={18} className="ml-auto group-open:rotate-90 transition-transform" />
            </summary>
            <div className="p-6 border-t border-slate-800 space-y-6 bg-black/20 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NeonTextArea
                  label="Custom Visual Prompt (SDXL)"
                  value={state.customVisualPrompt}
                  onChange={(e: any) => update('customVisualPrompt', e.target.value)}
                  placeholder="Tattoos, scars, specific details..."
                />
                <NeonTextArea
                  label="System Instruction (LLM)"
                  value={state.customSystemInstruction}
                  onChange={(e: any) => update('customSystemInstruction', e.target.value)}
                  placeholder="Hidden behavioral traits..."
                />
              </div>
              <NeonInput
                label="Your Appearance (User Context)"
                value={state.userAppearance}
                onChange={(e: any) => update('userAppearance', e.target.value)}
                placeholder="How she sees you..."
              />
            </div>
          </details>
        </div>

      </div>

      {/* ERROR DISPLAY */}
      {submitError && (
        <div className="fixed top-6 right-6 md:right-12 z-50 bg-red-500/95 text-white px-6 py-4 rounded-xl shadow-2xl border border-red-400 animate-in slide-in-from-top-2 max-w-md">
          <div className="flex items-start gap-3">
            <X size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Error</p>
              <p className="text-xs mt-1">{submitError}</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="ml-auto text-white/80 hover:text-white"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING SAVE BAR */}
      <div className="fixed bottom-6 right-6 md:right-12 z-50">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !state.name}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-2xl shadow-blue-900/40 transition-[background-color,transform,opacity] flex items-center gap-3 border border-blue-400/20"
        >
          {isSubmitting ? <Sparkles className="animate-spin" size={20} /> : <Save size={20} />}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {showCropper && originalImage && (
        <ImageCropper
          imageUrl={originalImage}
          onSave={handleCropSave}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
}
