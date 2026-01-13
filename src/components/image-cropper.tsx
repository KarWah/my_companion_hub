"use client";

import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Move, Check, X } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageUrl, onSave, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
      }
    };
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !containerRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to desired output (512x512 for profile picture)
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Get container dimensions
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Calculate crop area (300x300 square in the center)
    const cropSize = 300;
    const cropX = centerX - cropSize / 2;
    const cropY = centerY - cropSize / 2;

    // Calculate source coordinates on the actual image
    const imgRect = img.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;

    // Scale factor from displayed size to actual image size
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;

    // Calculate what part of the actual image is in the crop area
    const sourceX = (cropX - (imgRect.left - containerLeft)) * scaleX;
    const sourceY = (cropY - (imgRect.top - containerTop)) * scaleY;
    const sourceSize = cropSize * scaleX; // Assuming uniform scaling

    // Draw the cropped portion
    ctx.drawImage(
      img,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to base64
    const croppedImage = canvas.toDataURL("image/png");
    onSave(croppedImage);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Crop Profile Picture</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Drag to position, use zoom controls to adjust. The circular preview shows what will be saved.
        </p>

        {/* Crop Area */}
        <div
          ref={containerRef}
          className="relative w-full h-96 bg-slate-950 rounded-xl overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            className="absolute select-none pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: "center",
              left: "50%",
              top: "50%",
              marginLeft: "-50%",
              marginTop: "-50%",
            }}
            draggable={false}
          />

          {/* Crop overlay with circular cutout */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay */}
            <svg className="w-full h-full">
              <defs>
                <mask id="cropMask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle cx="50%" cy="50%" r="150" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="black" opacity="0.7" mask="url(#cropMask)" />
              <circle
                cx="50%"
                cy="50%"
                r="150"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          </div>

          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Move size={24} className="text-white/50" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Zoom:</span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-white"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-white font-mono w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-white"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-glow-pink rounded-lg transition-all text-white flex items-center gap-2"
            >
              <Check size={18} />
              Save Crop
            </button>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
