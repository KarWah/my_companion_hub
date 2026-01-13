"use client";

import { Heart, Sparkles, Settings2, ChevronRight } from "lucide-react";
import { NeonInput, NeonTextArea, TagInput, SelectWithCustom } from "../components";
import { PersonalityDepth } from "../PersonalityDepth";
import type { CompanionWizardState } from "@/types";
import {
  OCCUPATIONS,
  HEIGHTS,
  RELATIONSHIPS,
  HOBBY_PRESETS,
  FETISH_PRESETS,
  CLOTHING_PRESETS,
  CLOTHING_CATEGORY_LABELS,
  CLOTHING_COLORS,
} from "../constants";

interface IdentityStepProps {
  name: string;
  age: number;
  height: string;
  occupation: string;
  relationship: string;
  personalityArchetype: string;
  hobbies: string[];
  fetishes: string[];
  defaultOutfit: string;
  customVisualPrompt: string;
  customSystemInstruction: string;
  userAppearance: string;
  clothingSelections: Record<string, string>;
  wizardState: CompanionWizardState;
  onNameChange: (name: string) => void;
  onAgeChange: (age: number) => void;
  onHeightChange: (height: string) => void;
  onOccupationChange: (occupation: string) => void;
  onRelationshipChange: (relationship: string) => void;
  onPersonalityChange: (personality: string) => void;
  onHobbiesChange: (hobbies: string[]) => void;
  onFetishesChange: (fetishes: string[]) => void;
  onCustomVisualPromptChange: (prompt: string) => void;
  onCustomSystemInstructionChange: (instruction: string) => void;
  onUserAppearanceChange: (appearance: string) => void;
  onHobbyPresetToggle: (hobby: string) => void;
  onFetishPresetToggle: (fetish: string) => void;
  onClothingCategorySelect: (category: string, item: string) => void;
  onClothingColorSelect: (category: string, color: string) => void;
  onUpdate: (field: keyof CompanionWizardState, value: any) => void;
}

export function IdentityStep({
  name,
  age,
  height,
  occupation,
  relationship,
  personalityArchetype,
  hobbies,
  fetishes,
  defaultOutfit,
  customVisualPrompt,
  customSystemInstruction,
  userAppearance,
  clothingSelections,
  wizardState,
  onNameChange,
  onAgeChange,
  onHeightChange,
  onOccupationChange,
  onRelationshipChange,
  onPersonalityChange,
  onHobbiesChange,
  onFetishesChange,
  onCustomVisualPromptChange,
  onCustomSystemInstructionChange,
  onUserAppearanceChange,
  onHobbyPresetToggle,
  onFetishPresetToggle,
  onClothingCategorySelect,
  onClothingColorSelect,
  onUpdate,
}: IdentityStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-6">
        <NeonInput
          label="Character Name"
          value={name}
          onChange={(e: any) => onNameChange(e.target.value)}
          placeholder="e.g. Lauren Starr"
        />

        <div className="grid grid-cols-2 gap-4">
          <NeonInput
            label="Age"
            type="number"
            value={age}
            onChange={(e: any) => onAgeChange(parseInt(e.target.value))}
          />
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Height</label>
            <select
              value={height || 'average'}
              onChange={(e) => onHeightChange(e.target.value)}
              className="w-full bg-black/40 border border-slate-800 rounded-xl p-3.5 text-white text-sm"
            >
              {HEIGHTS.map(h => <option key={h} value={h.toLowerCase()}>{h}</option>)}
            </select>
          </div>
        </div>

        <SelectWithCustom
          label="Occupation"
          options={OCCUPATIONS}
          value={occupation}
          onChange={(val: string) => onOccupationChange(val)}
        />

        {/* Clothing Section - Compact */}
        <div className="space-y-3 border border-slate-800 rounded-lg p-4 bg-slate-900/30">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Default Outfit (Pick One Per Category)
          </label>

          {/* Category Selectors with Colors */}
          <div className="space-y-3">
            {Object.entries(CLOTHING_PRESETS).map(([category, items]) => {
              const categoryInfo = CLOTHING_CATEGORY_LABELS[category];
              const selectedColor = clothingSelections[`${category}Color`];

              return (
                <div key={category} className="space-y-1.5">
                  {/* Section Label */}
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                      {categoryInfo.section}
                    </span>
                    {/* Mini Color Selector */}
                    <div className="flex gap-1">
                      {CLOTHING_COLORS.slice(0, 11).map((colorOpt) => (
                        <button
                          key={colorOpt.id}
                          type="button"
                          onClick={() => onClothingColorSelect(category, colorOpt.id)}
                          className={`w-4 h-4 rounded ${colorOpt.color} transition-[opacity,box-shadow] ${
                            selectedColor === colorOpt.id ? 'ring-1 ring-white' : 'opacity-50 hover:opacity-100'
                          }`}
                          title={colorOpt.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Item Selector */}
                  <select
                    value={clothingSelections[category] || 'None'}
                    onChange={(e) => onClothingCategorySelect(category, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-white"
                  >
                    {items.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Result */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[9px] text-slate-500">Result:</span>
            <p className="text-[10px] text-white mt-1">{defaultOutfit || 'None'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
          <SelectWithCustom
            label="Personality"
            options={['Adventurous', 'Shy', 'Dominant', 'Bratty', 'Motherly', 'Yandere']}
            value={personalityArchetype}
            onChange={(val: string) => onPersonalityChange(val)}
          />

          <SelectWithCustom
            label="Relationship to You"
            options={RELATIONSHIPS}
            value={relationship}
            onChange={(val: string) => onRelationshipChange(val)}
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
                  onClick={() => onHobbyPresetToggle(hobby)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-[background-color,border-color,color] ${
                    (hobbies || []).includes(hobby)
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
              values={hobbies || []}
              onChange={(vals: string[]) => onHobbiesChange(vals)}
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
                  onClick={() => onFetishPresetToggle(fetish)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-[background-color,border-color,color] ${
                    (fetishes || []).includes(fetish)
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
              values={fetishes || []}
              onChange={(vals: string[]) => onFetishesChange(vals)}
              placeholder="Type and press Enter..."
            />
          </div>
        </div>

        <PersonalityDepth state={wizardState} onUpdate={onUpdate} />

        <div className="border border-slate-800 rounded-2xl overflow-hidden">
          <details className="group bg-black/30">
            <summary className="flex items-center gap-2 p-3 cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors">
              <Settings2 size={14} /> Advanced Tuning{' '}
              <ChevronRight size={14} className="ml-auto group-open:rotate-90 transition-transform" />
            </summary>
            <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/30">
              <NeonTextArea
                label="Custom Visual Prompt"
                value={customVisualPrompt}
                onChange={(e: any) => onCustomVisualPromptChange(e.target.value)}
                placeholder="Specific visual details..."
              />
              <NeonTextArea
                label="System Instruction"
                value={customSystemInstruction}
                onChange={(e: any) => onCustomSystemInstructionChange(e.target.value)}
                placeholder="Hidden behavior instructions..."
              />
              <NeonInput
                label="Your Appearance"
                value={userAppearance}
                onChange={(e: any) => onUserAppearanceChange(e.target.value)}
                placeholder="How she sees you..."
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
