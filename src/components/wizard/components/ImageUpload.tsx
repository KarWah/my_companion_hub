"use client";

import { Upload, Crop, ImageIcon } from "lucide-react";
import type { RefObject } from "react";

interface ImageUploadProps {
  imagePreview: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  mini?: boolean;
  onFileSelect: (file: File) => void;
  onCropClick: () => void;
}

export function ImageUpload({
  imagePreview,
  fileInputRef,
  mini = false,
  onFileSelect,
  onCropClick,
}: ImageUploadProps) {
  return (
    <div className="space-y-4 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      <div
        className={`relative ${
          mini ? 'aspect-square w-full rounded-2xl' : 'aspect-[2/3] w-full max-w-[240px] mx-auto rounded-2xl'
        } overflow-hidden shadow-2xl bg-black border-2 border-slate-800 group`}
      >
        {imagePreview ? (
          <>
            <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-full text-white transition-colors"
              >
                <Upload size={18} />
              </button>
              <button
                type="button"
                onClick={onCropClick}
                className="p-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-full text-white transition-colors"
              >
                <Crop size={18} />
              </button>
            </div>
          </>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-full text-slate-600 cursor-pointer hover:bg-slate-900/50 transition-colors"
          >
            <ImageIcon size={mini ? 24 : 48} className="mb-2 opacity-50" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Upload</span>
          </div>
        )}
      </div>
    </div>
  );
}
