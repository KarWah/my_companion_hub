"use client";

import { ImageUpload } from "../components";
import type { RefObject } from "react";

interface FinishStepProps {
  imagePreview: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  onCropClick: () => void;
}

export function FinishStep({
  imagePreview,
  fileInputRef,
  onFileSelect,
  onCropClick,
}: FinishStepProps) {
  return (
    <div className="space-y-8 max-w-lg mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-xl md:text-2xl font-bold text-white">Final Touch: Portrait</h2>
      <p className="text-slate-400 text-sm">Upload a specific image or we will generate one based on your choices.</p>
      <ImageUpload
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onFileSelect={onFileSelect}
        onCropClick={onCropClick}
      />
    </div>
  );
}
