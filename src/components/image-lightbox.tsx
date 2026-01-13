"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface ImageLightboxProps {
  images: Array<{
    id: string;
    url: string;
    caption?: string;
    date?: Date;
  }>;
  initialIndex: number;
  companionName: string;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  companionName,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentImage = images[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && canGoPrev) setCurrentIndex((i) => i - 1);
      if (e.key === "ArrowRight" && canGoNext) setCurrentIndex((i) => i + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, canGoPrev, canGoNext, onClose]);

  // Touch/swipe support
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canGoNext) setCurrentIndex((i) => i + 1);
    if (isRightSwipe && canGoPrev) setCurrentIndex((i) => i - 1);
  };

  // Preload adjacent images
  useEffect(() => {
    if (canGoNext) {
      const img = new Image();
      img.src = images[currentIndex + 1].url;
    }
    if (canGoPrev) {
      const img = new Image();
      img.src = images[currentIndex - 1].url;
    }
  }, [currentIndex, canGoNext, canGoPrev, images]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = `${companionName}-${currentImage.id}.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-slate-800/90 hover:bg-slate-700 rounded-full text-white transition-all hover:scale-110 z-10 backdrop-blur-sm"
        aria-label="Close lightbox"
      >
        <X size={24} />
      </button>

      {/* Image counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-full text-white text-sm font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Download button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="absolute top-4 left-4 md:top-6 md:left-6 p-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-full text-white transition-all hover:scale-110 shadow-glow-pink z-10"
        aria-label="Download image"
      >
        <Download size={20} />
      </button>

      {/* Previous button */}
      {canGoPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => i - 1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-slate-800/90 hover:bg-gradient-to-r hover:from-pink-600/20 hover:to-purple-600/20 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm z-10"
          aria-label="Previous image"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Next button */}
      {canGoNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => i + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-slate-800/90 hover:bg-gradient-to-r hover:from-pink-600/20 hover:to-purple-600/20 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm z-10"
          aria-label="Next image"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={currentImage.url}
          alt={currentImage.caption || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
          onLoad={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Caption */}
        {currentImage.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl">
            <p className="text-white text-sm line-clamp-2">
              {currentImage.caption}
            </p>
            {currentImage.date && (
              <p className="text-slate-400 text-xs mt-1">
                {new Date(currentImage.date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
