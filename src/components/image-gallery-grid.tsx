"use client";

import { Download } from "lucide-react";

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500 transition-all group"
        >
          <div className="aspect-[832/1216] relative overflow-hidden bg-slate-950">
            <img
              src={message.imageUrl!}
              alt="Generated"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />

            {/* Download overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a
                href={message.imageUrl!}
                download={`${companionName}-${message.id}.png`}
                className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={24} className="text-white" />
              </a>
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
  );
}
