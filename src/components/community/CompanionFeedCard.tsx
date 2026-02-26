import Link from "next/link";
import { User, Eye, MessageSquare } from "lucide-react";
import { RatingStars } from "./RatingStars";
import type { PublicCompanion } from "@/types";

interface CompanionFeedCardProps {
  companion: PublicCompanion;
}

export function CompanionFeedCard({ companion }: CompanionFeedCardProps) {
  return (
    <Link
      href={`/community/${companion.id}`}
      className="group block p-4 rounded-2xl border bg-slate-800 border-slate-700 hover:border-pink-500/30 hover:shadow-glow-pink transition-all duration-300"
    >
      {/* Header Image */}
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
        {companion.headerImageUrl ? (
          <img
            src={companion.headerImageUrl}
            alt={companion.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={64} className="text-slate-500" />
          </div>
        )}

        {/* Style badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              companion.style === "anime"
                ? "bg-purple-600/80 text-purple-100"
                : "bg-blue-600/80 text-blue-100"
            }`}
          >
            {companion.style}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white group-hover:text-pink-400 transition-colors truncate">
          {companion.name}
        </h3>

        <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
          {companion.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
            {companion.personalityArchetype}
          </span>
          <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
            {companion.occupation}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {formatNumber(companion.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              {formatNumber(companion.chatCount)}
            </span>
          </div>

          <RatingStars rating={companion.averageRating} count={companion.ratingCount} size="sm" />
        </div>

        {/* Creator */}
        <div className="text-xs text-slate-500">
          by @{companion.creatorUsername}
        </div>
      </div>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
