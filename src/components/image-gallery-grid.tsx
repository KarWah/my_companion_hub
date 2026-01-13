"use client";

import { useState } from "react";
import { ImageLightbox } from "./image-lightbox";

interface Message {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
}

interface ImageGalleryGridProps {
  messages: Message[];
  companionName: string;
}

export function ImageGalleryGrid({ messages, companionName }: ImageGalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const images = messages.map((msg) => ({
    id: msg.id,
    url: msg.imageUrl!,
    caption: msg.content,
    date: msg.createdAt,
  }));

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            onClick={() => openLightbox(index)}
            className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden hover:border-pink-500/50 hover:shadow-glow-pink transition-all duration-300 group cursor-pointer hover:scale-[1.02]"
          >
            <div className="aspect-[832/1216] relative overflow-hidden bg-slate-900">
              <img
                src={message.imageUrl!}
                alt="Generated"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />

              {/* View overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 rounded-full shadow-glow-pink">
                  Click to view
                </div>
              </div>
            </div>

            {/* Message context */}
            <div className="p-3">
              <p className="text-xs text-slate-400 line-clamp-2">
                {message.content}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(message.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={selectedIndex}
          companionName={companionName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
