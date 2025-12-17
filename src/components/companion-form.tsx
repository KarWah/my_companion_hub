"use client";

import { useFormStatus } from "react-dom";
import { ReactNode, useState, useRef } from "react";
import { Image as ImageIcon, Upload, X, Crop } from "lucide-react";
import { ImageCropper } from "./image-cropper";

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

interface CompanionFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    name?: string;
    description?: string;
    visualDescription?: string;
    currentOutfit?: string;
    userAppearance?: string;
    headerImage?: string;
  };
  submitLabel: string;
}

export function CompanionForm({ action, defaultValues, submitLabel }: CompanionFormProps) {
  const [headerImage, setHeaderImage] = useState(defaultValues?.headerImage || "");
  const [imagePreview, setImagePreview] = useState(defaultValues?.headerImage || "");
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // File validation constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_DIMENSIONS = { width: 2048, height: 2048 };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Validate image file
  const validateImageFile = async (file: File): Promise<{
    valid: boolean;
    error?: string
  }> => {
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `File is too large (${sizeMB}MB). Maximum size is 5MB.`
      };
    }

    // Check image dimensions
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.width > MAX_DIMENSIONS.width || img.height > MAX_DIMENSIONS.height) {
          resolve({
            valid: false,
            error: `Image dimensions too large (${img.width}x${img.height}). Maximum is ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}.`
          });
        } else {
          resolve({ valid: true });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          error: 'Failed to load image. File may be corrupted.'
        });
      };

      img.src = url;
    });
  };

  // Handle file selection (from file input or drop)
  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsValidating(true);

    try {
      // Validate file
      const validation = await validateImageFile(file);

      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        setIsValidating(false);
        return;
      }

      // Convert to base64
      const base64 = await fileToBase64(file);
      setOriginalImage(base64);
      setHeaderImage(base64);
      setImagePreview(base64);
      setUploadError(null);
    } catch (error) {
      console.error('Error reading file:', error);
      setUploadError('Failed to read image file. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle crop save
  const handleCropSave = (croppedImage: string) => {
    setHeaderImage(croppedImage);
    setImagePreview(croppedImage);
    setShowCropper(false);
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    setShowCropper(false);
  };

  // Open cropper
  const openCropper = () => {
    setShowCropper(true);
  };

  // Handle paste event (for both base64 text and actual images)
  const handlePaste = async (e: React.ClipboardEvent) => {
    // Check for image files in clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleFile(file);
          return;
        }
      }
    }

    // Fallback: check for base64 text
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.startsWith('data:image')) {
      e.preventDefault();
      setOriginalImage(pastedText);
      setHeaderImage(pastedText);
      setImagePreview(pastedText);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  // Handle file input change
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  // Clear image
  const clearImage = () => {
    setHeaderImage("");
    setImagePreview("");
    setOriginalImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <form action={action} className="space-y-6">
        {/* Header Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Header Image (Optional)</label>
          <p className="text-xs text-slate-500">
            Drag & drop an image, paste with CTRL+V, or click to upload. Max 5MB, 2048x2048px.
          </p>

          {/* Upload Error */}
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {uploadError}
            </div>
          )}

          {/* Hidden input for form submission */}
          <input type="hidden" name="headerImage" value={headerImage} />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {imagePreview ? (
          /* Image Preview */
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="aspect-[3/2] relative">
              <img
                src={imagePreview}
                alt="Header preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={openCropper}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                title="Crop image"
              >
                <Crop size={20} />
              </button>
              <button
                type="button"
                onClick={clearImage}
                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                title="Remove image"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ) : (
          /* Drop Zone */
          <div
            ref={dropZoneRef}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isValidating && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all
              ${isValidating
                ? 'border-slate-700 bg-slate-900 cursor-wait'
                : isDragging
                  ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800 cursor-pointer'
              }
            `}
            tabIndex={0}
          >
            {isValidating ? (
              <>
                <div className="mx-auto mb-4 w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400">Validating image...</p>
              </>
            ) : (
              <>
                <ImageIcon size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400 mb-2">
                  {isDragging ? 'Drop image here' : 'Click to upload, drag & drop, or paste (CTRL+V)'}
                </p>
                <p className="text-xs text-slate-500">
                  PNG, JPG, WebP up to 5MB (max 2048x2048px)
                </p>
              </>
            )}
          </div>
        )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Name</label>
          <input
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="e.g. Lumen"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Personality & Traits</label>
          <p className="text-xs text-slate-500">Roleplay instructions for the AI.</p>
          <textarea
            name="description"
            required
            defaultValue={defaultValues?.description}
            rows={6}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="She is a 20-something gamer..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Visual Body Description</label>
          <p className="text-xs text-slate-500">Physical features ONLY (Face, hair, body type). No clothes.</p>
          <textarea
            name="visualDescription"
            required
            defaultValue={defaultValues?.visualDescription}
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="(masterpiece), 1girl, blue eyes..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Default Outfit</label>
          <p className="text-xs text-slate-500">What she is wearing initially.</p>
          <input
            name="currentOutfit"
            required
            defaultValue={defaultValues?.currentOutfit}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="oversized hoodie, gray shorts..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">User Appearance</label>
          <p className="text-xs text-slate-500">How YOU look (for context in generated images).</p>
          <input
            name="userAppearance"
            defaultValue={defaultValues?.userAppearance}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            placeholder="Male, short hair, glasses..."
          />
        </div>

        <div className="pt-4">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </form>

      {/* Image Cropper Modal - Outside form to prevent button conflicts */}
      {showCropper && originalImage && (
        <ImageCropper
          imageUrl={originalImage}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
