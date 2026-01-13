"use client";

import { useState } from "react";

export function useWizardProgress(maxSteps: number, onComplete?: () => void) {
  const [step, setStep] = useState(1);

  const nextStep = () => {
    setStep(s => {
      const newStep = Math.min(s + 1, maxSteps);
      if (newStep === maxSteps && onComplete) {
        onComplete();
      }
      return newStep;
    });
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const goToStep = (n: number) => {
    setStep(Math.max(1, Math.min(n, maxSteps)));
  };

  const progress = (step / maxSteps) * 100;

  return {
    step,
    progress,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: step === 1,
    isLastStep: step === maxSteps,
  };
}
