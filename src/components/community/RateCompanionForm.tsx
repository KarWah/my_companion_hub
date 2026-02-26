"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, Check } from "lucide-react";
import { rateCompanion } from "@/app/actions";

interface RateCompanionFormProps {
  companionId: string;
}

export function RateCompanionForm({ companionId }: RateCompanionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (selectedRating === 0) {
      setError("Please select a rating");
      return;
    }

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await rateCompanion(companionId, selectedRating);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to submit rating");
      }
    });
  };

  const displayRating = hoveredRating || selectedRating;

  return (
    <div className="space-y-4">
      {/* Star Rating */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setSelectedRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-slate-600 text-slate-600"
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      {/* Rating Label */}
      <div className="text-center text-sm text-slate-400">
        {displayRating === 0 && "Click to rate"}
        {displayRating === 1 && "Poor"}
        {displayRating === 2 && "Fair"}
        {displayRating === 3 && "Good"}
        {displayRating === 4 && "Great"}
        {displayRating === 5 && "Excellent"}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isPending || selectedRating === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : success ? (
          <>
            <Check className="w-4 h-4 text-green-400" />
            Thanks for rating!
          </>
        ) : (
          "Submit Rating"
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
