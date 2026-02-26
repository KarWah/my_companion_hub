"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function RatingStars({
  rating,
  count,
  size = "md",
  interactive = false,
  onRate,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const starSize = sizeClasses[size];
  const textSize = textSizes[size];

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rating);
          const halfFilled = !filled && star <= Math.ceil(rating) && rating % 1 >= 0.5;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onRate?.(star)}
              className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
            >
              <Star
                className={`${starSize} ${
                  filled
                    ? "fill-yellow-400 text-yellow-400"
                    : halfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "fill-slate-600 text-slate-600"
                }`}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && (
        <span className={`${textSize} text-slate-400 ml-1`}>
          {rating.toFixed(1)}
          {count !== undefined && count > 0 && (
            <span className="text-slate-500"> ({count})</span>
          )}
        </span>
      )}

      {rating === 0 && count === 0 && (
        <span className={`${textSize} text-slate-500 ml-1`}>No ratings</span>
      )}
    </div>
  );
}
