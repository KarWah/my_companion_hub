"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Palette, User, Heart, Upload, X } from "lucide-react";
import { INITIAL_WIZARD_STATE } from "@/types";
import { compileCompanionProfile } from "@/lib/prompt-compiler";
import { ImageCropper } from "../image-cropper";
import { useWizardState, useImageUpload } from "./hooks";
import { EditMode } from "./EditMode";
import { StyleStep, LookStep, BodyStep, IdentityStep, FinishStep } from "./steps";
import type { CompanionWizardProps } from "./types";

const MAX_STEPS = 5;

const STEPS = [
  { id: 1, title: "Style", icon: Palette },
  { id: 2, title: "Look", icon: User },
  { id: 3, title: "Body", icon: Sparkles },
  { id: 4, title: "Identity", icon: Heart },
  { id: 5, title: "Finish", icon: Upload },
];

export function CompanionWizard({
  action,
  initialState = INITIAL_WIZARD_STATE,
  initialImage = "",
  mode = 'create'
}: CompanionWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize wizard state management
  const wizardState = useWizardState(initialState);

  // Initialize image upload management
  const imageUpload = useImageUpload(initialImage);

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const compiled = compileCompanionProfile(wizardState.state);
      const formData = new FormData();

      // Append compiled profile data
      Object.entries(compiled).forEach(([key, val]) => {
        formData.append(key, val as string);
      });

      // Append image
      formData.append("headerImage", imageUpload.imagePreview);

      await action(formData);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
      console.error('Companion wizard submission error:', error);
    }
  };

  // Render edit mode layout
  if (mode === 'edit') {
    return (
      <EditMode
        state={wizardState.state}
        update={wizardState.update}
        imagePreview={imageUpload.imagePreview}
        showCropper={imageUpload.showCropper}
        originalImage={imageUpload.originalImage}
        fileInputRef={imageUpload.fileInputRef}
        handleFile={imageUpload.handleFile}
        setShowCropper={imageUpload.setShowCropper}
        handleCropSave={imageUpload.handleCropSave}
        hairPrimary={wizardState.hairPrimary}
        hairModifier={wizardState.hairModifier}
        hairTexture={wizardState.hairTexture}
        customHairPrimary={wizardState.customHairPrimary}
        customHairColorText={wizardState.customHairColorText}
        handleHairPrimarySelect={wizardState.handleHairPrimarySelect}
        handleCustomHairPrimaryChange={wizardState.handleCustomHairPrimaryChange}
        handleHairModifierSelect={wizardState.handleHairModifierSelect}
        handleHairTextureSelect={wizardState.handleHairTextureSelect}
        handleHairColorSelect={wizardState.handleHairColorSelect}
        handleCustomHairColorChange={wizardState.handleCustomHairColorChange}
        handleHobbyPresetToggle={wizardState.handleHobbyPresetToggle}
        handleFetishPresetToggle={wizardState.handleFetishPresetToggle}
        clothingSelections={wizardState.clothingSelections}
        handleClothingCategorySelect={wizardState.handleClothingCategorySelect}
        handleClothingColorSelect={wizardState.handleClothingColorSelect}
        isSubmitting={isSubmitting}
        submitError={submitError}
        setSubmitError={setSubmitError}
        handleSubmit={handleSubmit}
      />
    );
  }

  // Render create mode wizard
  return (
    <div className="w-full max-w-4xl mx-auto min-h-[600px] flex flex-col pb-20">

      {/* Progress Header */}
      <div className="mb-8 relative px-4">
        <div className="flex justify-between items-center relative z-10">
          {STEPS.map((s) => {
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-[background-color,border-color,transform,box-shadow,color] duration-300 ${
                    isActive
                      ? 'bg-pink-600 border-pink-400 shadow-lg scale-110'
                      : isDone
                      ? 'bg-slate-800 border-pink-900 text-pink-500'
                      : 'bg-black border-slate-800 text-slate-600'
                  }`}
                >
                  <s.icon size={20} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-600'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute top-5 md:top-6 left-0 right-0 h-0.5 bg-slate-900 -z-0 mx-10">
          <div
            className="h-full bg-gradient-to-r from-pink-600 to-purple-600 transition-[width] duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 bg-black/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl" style={{ contain: 'layout style paint' }}>
        {step === 1 && (
          <StyleStep
            style={wizardState.state.style}
            onStyleChange={(style: string) => wizardState.update('style', style)}
          />
        )}

        {step === 2 && (
          <LookStep
            ethnicity={wizardState.state.ethnicity}
            skinTone={wizardState.state.skinTone}
            hairStyle={wizardState.state.hairStyle}
            hairColor={wizardState.state.hairColor}
            eyeColor={wizardState.state.eyeColor}
            hairPrimary={wizardState.hairPrimary}
            hairModifier={wizardState.hairModifier}
            hairTexture={wizardState.hairTexture}
            customHairColorText={wizardState.customHairColorText}
            onEthnicityChange={(ethnicity: string) => wizardState.update('ethnicity', ethnicity)}
            onSkinToneChange={(skinTone: string) => wizardState.update('skinTone', skinTone)}
            onEyeColorChange={(eyeColor: string) => wizardState.update('eyeColor', eyeColor)}
            onHairPrimarySelect={wizardState.handleHairPrimarySelect}
            onHairModifierSelect={wizardState.handleHairModifierSelect}
            onHairTextureSelect={wizardState.handleHairTextureSelect}
            onHairColorSelect={wizardState.handleHairColorSelect}
            onCustomHairColorChange={wizardState.handleCustomHairColorChange}
          />
        )}

        {step === 3 && (
          <BodyStep
            bodyType={wizardState.state.bodyType}
            breastSize={wizardState.state.breastSize}
            buttSize={wizardState.state.buttSize}
            onBodyTypeChange={(bodyType: string) => wizardState.update('bodyType', bodyType)}
            onBreastSizeChange={(size: string) => wizardState.update('breastSize', size)}
            onButtSizeChange={(size: string) => wizardState.update('buttSize', size)}
          />
        )}

        {step === 4 && (
          <IdentityStep
            name={wizardState.state.name}
            age={wizardState.state.age}
            height={wizardState.state.height}
            occupation={wizardState.state.occupation}
            relationship={wizardState.state.relationship}
            personalityArchetype={wizardState.state.personalityArchetype}
            hobbies={wizardState.state.hobbies}
            fetishes={wizardState.state.fetishes}
            defaultOutfit={wizardState.state.defaultOutfit}
            customVisualPrompt={wizardState.state.customVisualPrompt}
            customSystemInstruction={wizardState.state.customSystemInstruction}
            userAppearance={wizardState.state.userAppearance}
            clothingSelections={wizardState.clothingSelections}
            wizardState={wizardState.state}
            onNameChange={(name: string) => wizardState.update('name', name)}
            onAgeChange={(age: number) => wizardState.update('age', age)}
            onHeightChange={(height: string) => wizardState.update('height', height)}
            onOccupationChange={(occupation: string) => wizardState.update('occupation', occupation)}
            onRelationshipChange={(relationship: string) => wizardState.update('relationship', relationship)}
            onPersonalityChange={(personality: string) => wizardState.update('personalityArchetype', personality)}
            onHobbiesChange={(hobbies: string[]) => wizardState.update('hobbies', hobbies)}
            onFetishesChange={(fetishes: string[]) => wizardState.update('fetishes', fetishes)}
            onCustomVisualPromptChange={(prompt: string) => wizardState.update('customVisualPrompt', prompt)}
            onCustomSystemInstructionChange={(instruction: string) => wizardState.update('customSystemInstruction', instruction)}
            onUserAppearanceChange={(appearance: string) => wizardState.update('userAppearance', appearance)}
            onHobbyPresetToggle={wizardState.handleHobbyPresetToggle}
            onFetishPresetToggle={wizardState.handleFetishPresetToggle}
            onClothingCategorySelect={wizardState.handleClothingCategorySelect}
            onClothingColorSelect={wizardState.handleClothingColorSelect}
            onUpdate={wizardState.update}
          />
        )}

        {step === 5 && (
          <FinishStep
            imagePreview={imageUpload.imagePreview}
            fileInputRef={imageUpload.fileInputRef}
            onFileSelect={imageUpload.handleFile}
            onCropClick={() => imageUpload.setShowCropper(true)}
          />
        )}
      </div>

      {/* ERROR DISPLAY */}
      {submitError && (
        <div className="mt-4 bg-red-500/95 text-white px-6 py-4 rounded-xl shadow-xl border border-red-400 animate-in slide-in-from-top-2">
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

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center px-4">
        <button
          type="button"
          onClick={() => setStep(prev => prev - 1)}
          disabled={step === 1 || isSubmitting}
          className="px-6 py-3 rounded-xl font-bold text-slate-500 disabled:opacity-0 hover:text-white transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={20} /> Back
        </button>

        {step < MAX_STEPS ? (
          <button
            type="button"
            onClick={() => setStep(prev => prev + 1)}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-pink-900/20 transition-[background,transform] transform hover:scale-105 flex items-center gap-2"
          >
            Next Step <ChevronRight size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !wizardState.state.name}
            className="px-10 py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-[background-color,transform,color] transform hover:scale-105 flex items-center gap-2"
          >
            {isSubmitting ? "Creating..." : "Bring Her to Life"} <Sparkles size={20} />
          </button>
        )}
      </div>

      {/* Image Cropper Modal */}
      {imageUpload.showCropper && imageUpload.originalImage && (
        <ImageCropper
          imageUrl={imageUpload.originalImage}
          onSave={imageUpload.handleCropSave}
          onCancel={() => imageUpload.setShowCropper(false)}
        />
      )}
    </div>
  );
}
