"use client";

import { useState } from "react";
import { ChevronRight, Brain, MessageCircle, Heart, Sparkles, Users } from "lucide-react";
import { CompanionWizardState } from "@/types";
import { TagInput } from "./components/TagInput";
import { SelectWithCustom } from "./components/SelectWithCustom";

// Presets
const SPEECH_STYLES = ['Casual', 'Formal', 'Playful', 'Flirty', 'Sarcastic', 'Quirky', 'Sweet', 'Shy'];

const SPEECH_PATTERN_PRESETS = [
  'like...', 'you know', 'um...', 'well...', '...right?', 'darling', 'babe',
  'sweetie', 'hun', 'dear', 'ugh', 'whatever', 'seriously?', 'obviously'
];

const BEHAVIOR_TRAITS = [
  'Teasing', 'Affectionate', 'Protective', 'Shy at first', 'Clingy', 'Independent',
  'Nurturing', 'Competitive', 'Playful', 'Serious', 'Mischievous', 'Loyal',
  'Flirty', 'Reserved', 'Energetic', 'Calm', 'Adventurous', 'Cautious'
];

const INITIATION_STYLES = ['Bold & Forward', 'Subtle & Hinting', 'Waiting & Reactive', 'Direct & Honest'];
const CONFIDENCE_LEVELS = ['Very Shy', 'Somewhat Shy', 'Balanced', 'Confident', 'Overconfident'];

const EMOTIONAL_TRAITS = [
  'Easily embarrassed', 'Jealous', 'Empathetic', 'Guarded', 'Open book', 'Moody',
  'Stoic', 'Emotional', 'Sensitive', 'Tough', 'Compassionate', 'Cold',
  'Warm', 'Anxious', 'Carefree', 'Passionate', 'Detached', 'Caring'
];

const VULNERABILITY_PRESETS = [
  'Self-conscious about body', 'Afraid of rejection', 'Worried about being too much',
  'Insecure about intelligence', 'Fears being abandoned', 'Anxious in social situations',
  'Struggles with self-worth', 'Afraid of intimacy', 'Worries about not being good enough'
];

const QUIRK_PRESETS = [
  'Bites lip when nervous', 'Plays with hair when thinking', 'Avoids eye contact when shy',
  'Giggles when embarrassed', 'Twirls hair when flirting', 'Fidgets with hands',
  'Blushes easily', 'Stutters when flustered', 'Tilts head when curious',
  'Covers face when laughing', 'Touches neck when anxious', 'Bounces when excited'
];

const FLIRTATION_STYLES = ['Subtle', 'Bold', 'Playful', 'Romantic', 'Awkward'];
const HUMOR_STYLES = ['Dry & Sarcastic', 'Playful & Teasing', 'Wholesome', 'Dark', 'Goofy'];
const INTIMACY_PACES = ['Slow Burn', 'Cautious', 'Natural Flow', 'Eager', 'Forward'];

interface PersonalityDepthProps {
  state: CompanionWizardState;
  onUpdate: (field: keyof CompanionWizardState, value: any) => void;
}

export function PersonalityDepth({ state, onUpdate }: PersonalityDepthProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper for multi-select presets
  const toggleArrayItem = (field: keyof CompanionWizardState, item: string) => {
    const current = (state[field] as string[]) || [];
    if (current.includes(item)) {
      onUpdate(field, current.filter(i => i !== item));
    } else {
      onUpdate(field, [...current, item]);
    }
  };

  return (
    <div className="border-2 border-slate-700/50 rounded-2xl overflow-hidden bg-slate-800/50 shadow-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 cursor-pointer text-sm font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
      >
        <Brain size={20} className="text-purple-400" />
        <span>Personality Depth (Optional - For Richer Characters)</span>
        <ChevronRight
          size={18}
          className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-slate-700 space-y-8 bg-slate-950/40 animate-in slide-in-from-top-2">

          {/* Communication Style */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <MessageCircle size={14} /> Communication Style
            </h3>

            <SelectWithCustom
              label="Speech Style"
              options={SPEECH_STYLES}
              value={state.speechStyle}
              onChange={(val) => onUpdate('speechStyle', val)}
            />

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Speech Patterns (Catchphrases, Verbal Tics)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SPEECH_PATTERN_PRESETS.map((pattern) => (
                  <button
                    key={pattern}
                    type="button"
                    onClick={() => toggleArrayItem('speechPattern', pattern)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${(state.speechPattern || []).includes(pattern)
                      ? 'bg-cyan-500 border-cyan-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
              <TagInput
                label="Custom Speech Patterns"
                values={state.speechPattern}
                onChange={(vals) => onUpdate('speechPattern', vals)}
                placeholder="Type and press Enter..."
              />
            </div>
          </div>

          {/* Behavioral Patterns */}
          <div className="space-y-4 border-t border-slate-700 pt-6">
            <h3 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} /> Behavioral Patterns
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Behavior Traits
              </label>
              <div className="flex flex-wrap gap-2">
                {BEHAVIOR_TRAITS.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleArrayItem('behaviorTraits', trait)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${(state.behaviorTraits || []).includes(trait)
                      ? 'bg-pink-500 border-pink-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Initiation Style
              </label>
              <div className="flex flex-wrap gap-2">
                {INITIATION_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onUpdate('initiationStyle', style)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${state.initiationStyle === style
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Confidence Level
              </label>
              <div className="flex flex-wrap gap-2">
                {CONFIDENCE_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onUpdate('confidenceLevel', level)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${state.confidenceLevel === level
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Emotional Depth */}
          <div className="space-y-4 border-t border-slate-700 pt-6">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Heart size={14} /> Emotional Depth
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Emotional Traits
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONAL_TRAITS.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleArrayItem('emotionalTraits', trait)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${(state.emotionalTraits || []).includes(trait)
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Vulnerabilities
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {VULNERABILITY_PRESETS.map((vuln) => (
                  <button
                    key={vuln}
                    type="button"
                    onClick={() => toggleArrayItem('vulnerabilities', vuln)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${(state.vulnerabilities || []).includes(vuln)
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {vuln}
                  </button>
                ))}
              </div>
              <TagInput
                label="Custom Vulnerabilities"
                values={state.vulnerabilities}
                onChange={(vals) => onUpdate('vulnerabilities', vals)}
                placeholder="Type and press Enter..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Quirks & Habits
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {QUIRK_PRESETS.map((quirk) => (
                  <button
                    key={quirk}
                    type="button"
                    onClick={() => toggleArrayItem('quirks', quirk)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${(state.quirks || []).includes(quirk)
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {quirk}
                  </button>
                ))}
              </div>
              <TagInput
                label="Custom Quirks"
                values={state.quirks}
                onChange={(vals) => onUpdate('quirks', vals)}
                placeholder="Type and press Enter..."
              />
            </div>
          </div>

          {/* Interaction Style */}
          <div className="space-y-4 border-t border-slate-700 pt-6">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} /> Interaction Style
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Flirtation Style
              </label>
              <div className="flex flex-wrap gap-2">
                {FLIRTATION_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onUpdate('flirtationStyle', style)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${state.flirtationStyle === style
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Humor Style
              </label>
              <div className="flex flex-wrap gap-2">
                {HUMOR_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onUpdate('humorStyle', style)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${state.humorStyle === style
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Intimacy Pace
              </label>
              <div className="flex flex-wrap gap-2">
                {INTIMACY_PACES.map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => onUpdate('intimacyPace', pace)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${state.intimacyPace === pace
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
