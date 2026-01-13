// Type definitions for Companion Wizard components

import type { CompanionWizardState } from "@/types";

export interface WizardOption {
  id: string;
  label: string;
  img: string;
}

export interface ColorOption {
  id?: string;
  value?: string;
  label: string;
  color: string;
}

export interface ImageSelectionGridProps {
  options: WizardOption[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  aspectRatio?: string;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  customPlaceholder?: string;
  customLabel?: string;
}

export interface ColorSelectionGridProps {
  options: ColorOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export interface SectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
  className?: string;
}

export interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export interface NeonTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export interface SelectWithCustomProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export interface CompanionWizardProps {
  action: (formData: FormData) => void;
  initialState?: CompanionWizardState;
  initialImage?: string;
  mode?: 'create' | 'edit';
}

export interface WizardStep {
  id: number;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
}

// Hair system types
export interface HairBaseStyle {
  id: string;
  label: string;
  img: string;
  supportsTexture: boolean; // Can combine with texture modifiers
}

export interface HairTexture {
  id: string;
  label: string;
}
