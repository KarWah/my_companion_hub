"use client";

import { useState, useRef } from "react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../utils/validators";

export function useImageUpload(initialImage?: string) {
  const [imagePreview, setImagePreview] = useState(initialImage || "");
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (croppedImage: string) => {
    setImagePreview(croppedImage);
    setShowCropper(false);
  };

  return {
    imagePreview,
    showCropper,
    originalImage,
    fileInputRef,
    handleFile,
    handleCropSave,
    setShowCropper,
    setImagePreview,
  };
}
