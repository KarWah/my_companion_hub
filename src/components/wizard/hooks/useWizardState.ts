"use client";

import { useState } from "react";
import type { CompanionWizardState } from "@/types";
import { parseHairStyle, parseClothingByCategory } from "../utils/parsers";
import { HAIR_PRIMARY_STYLES } from "../constants";

export function useWizardState(initialState: CompanionWizardState) {
  const [state, setState] = useState<CompanionWizardState>(initialState);

  // Hair state parsing
  const initialHairParsed = parseHairStyle(state.hairStyle || 'loose');
  const [hairPrimary, setHairPrimary] = useState(initialHairParsed.primary);
  const [hairModifier, setHairModifier] = useState<string>(initialHairParsed.modifiers[0] || '');
  const [hairTexture, setHairTexture] = useState(initialHairParsed.texture);
  const [customHairPrimary, setCustomHairPrimary] = useState(initialHairParsed.customPrimary);
  const [customHairColorText, setCustomHairColorText] = useState('');

  // Clothing state parsing
  const initialClothing = parseClothingByCategory(state.defaultOutfit || '');
  const [clothingSelections, setClothingSelections] = useState(initialClothing);

  const update = (field: keyof CompanionWizardState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  // Three-tier hair system: Primary + Modifier + Texture
  const buildHairStyle = (primary: string, modifier: string, texture: string, customPrimary: string) => {
    const parts = [
      primary === 'custom' ? customPrimary : primary,
      modifier,
      texture
    ].filter(Boolean);
    return parts.join(' ');
  };

  const handleHairPrimarySelect = (id: string) => {
    setHairPrimary(id);
    if (id !== 'custom') {
      setCustomHairPrimary('');
      update('hairStyle', buildHairStyle(id, hairModifier, hairTexture, ''));
    }
  };

  const handleCustomHairPrimaryChange = (text: string) => {
    setCustomHairPrimary(text);
    update('hairStyle', buildHairStyle('custom', hairModifier, hairTexture, text));
  };

  const handleHairModifierSelect = (id: string) => {
    setHairModifier(id);
    update('hairStyle', buildHairStyle(hairPrimary, id, hairTexture, customHairPrimary));
  };

  const handleHairTextureSelect = (id: string) => {
    setHairTexture(id);
    update('hairStyle', buildHairStyle(hairPrimary, hairModifier, id, customHairPrimary));
  };

  const handleHairColorSelect = (id: string) => {
    if (id === 'custom') {
      update('hairColor', customHairColorText || 'custom');
    } else {
      setCustomHairColorText('');
      update('hairColor', id);
    }
  };

  const handleCustomHairColorChange = (text: string) => {
    setCustomHairColorText(text);
    update('hairColor', text);
  };

  const handleHobbyPresetToggle = (hobby: string) => {
    const current = state.hobbies || [];
    const newHobbies = current.includes(hobby)
      ? current.filter(h => h !== hobby)
      : [...current, hobby];
    update('hobbies', newHobbies);
  };

  const handleFetishPresetToggle = (fetish: string) => {
    const current = state.fetishes || [];
    const newFetishes = current.includes(fetish)
      ? current.filter(f => f !== fetish)
      : [...current, fetish];
    update('fetishes', newFetishes);
  };

  // Clothing handling
  const handleClothingCategorySelect = (category: string, item: string) => {
    const newSelections = { ...clothingSelections, [category]: item };
    setClothingSelections(newSelections);
    updateClothingOutfit(newSelections);
  };

  const handleClothingColorSelect = (category: string, color: string) => {
    const newSelections = { ...clothingSelections, [`${category}Color`]: color };
    setClothingSelections(newSelections);
    updateClothingOutfit(newSelections);
  };

  const updateClothingOutfit = (selections: any) => {
    const items: string[] = [];
    const categories = ['outerwear', 'top', 'bottom', 'fullCoverage', 'underwearTop', 'underwearBottom', 'legwear', 'footwear'];

    categories.forEach(category => {
      const item = selections[category];
      if (item && item !== 'None') {
        const color = selections[`${category}Color`];
        const itemString = color ? `${color} ${item}` : item;
        items.push(itemString);
      }
    });

    const outfitString = items.length > 0 ? items.join(', ') : 'None';
    update('defaultOutfit', outfitString);
  };

  return {
    state,
    update,
    // Hair system
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
    // Hobbies and fetishes
    handleHobbyPresetToggle,
    handleFetishPresetToggle,
    // Clothing
    clothingSelections,
    handleClothingCategorySelect,
    handleClothingColorSelect,
  };
}
