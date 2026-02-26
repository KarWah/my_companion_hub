"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Filter, X, Search } from "lucide-react";

interface CommunityFiltersProps {
  currentFilters: {
    style?: string;
    personality?: string;
    relationship?: string;
    occupation?: string;
    hobby?: string;
    sort?: string;
    search?: string;
  };
}

const PERSONALITY_OPTIONS = [
  "Adventurous",
  "Shy",
  "Confident",
  "Playful",
  "Mysterious",
  "Caring",
  "Tsundere",
  "Yandere",
  "Kuudere",
  "Dandere",
];

const RELATIONSHIP_OPTIONS = [
  "Stranger",
  "Neighbor",
  "Coworker",
  "Friend",
  "Best Friend",
  "Romantic Interest",
  "Partner",
];

const OCCUPATION_OPTIONS = [
  "Student",
  "Teacher",
  "Nurse",
  "Doctor",
  "Artist",
  "Musician",
  "Chef",
  "Personal Trainer",
  "Streamer",
  "Model",
];

const HOBBY_OPTIONS = [
  "Gaming",
  "Reading",
  "Cooking",
  "Fitness",
  "Music",
  "Art",
  "Travel",
  "Movies",
  "Fashion",
  "Photography",
  "Dancing",
  "Sports",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
];

export function CommunityFilters({ currentFilters }: CommunityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(currentFilters.search || "");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (currentFilters.search || "")) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery) {
          params.set("search", searchQuery);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.push(`/community?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentFilters.search, router, searchParams]);

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to page 1 when changing filters
      params.delete("page");

      router.push(`/community?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    router.push("/community");
  }, [router]);

  const hasActiveFilters =
    currentFilters.style ||
    currentFilters.personality ||
    currentFilters.relationship ||
    currentFilters.occupation ||
    currentFilters.hobby ||
    currentFilters.search;

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search companions by name..."
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Top bar with sort and expand toggle */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isExpanded || hasActiveFilters
              ? "bg-pink-600/20 text-pink-400 border border-pink-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          <Filter size={18} />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-pink-600 text-white rounded-full">
              Active
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <select
            value={currentFilters.sort || "newest"}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Art Style */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Art Style
              </label>
              <select
                value={currentFilters.style || ""}
                onChange={(e) => updateFilter("style", e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="">All Styles</option>
                <option value="anime">Anime</option>
                <option value="realistic">Realistic</option>
              </select>
            </div>

            {/* Personality */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Personality
              </label>
              <select
                value={currentFilters.personality || ""}
                onChange={(e) => updateFilter("personality", e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="">All Personalities</option>
                {PERSONALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Relationship
              </label>
              <select
                value={currentFilters.relationship || ""}
                onChange={(e) => updateFilter("relationship", e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="">All Relationships</option>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Occupation
              </label>
              <select
                value={currentFilters.occupation || ""}
                onChange={(e) => updateFilter("occupation", e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="">All Occupations</option>
                {OCCUPATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Hobby/Interest */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Interests
              </label>
              <select
                value={currentFilters.hobby || ""}
                onChange={(e) => updateFilter("hobby", e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="">All Interests</option>
                {HOBBY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {currentFilters.style && (
            <FilterChip
              label={`Style: ${currentFilters.style}`}
              onRemove={() => updateFilter("style", null)}
            />
          )}
          {currentFilters.personality && (
            <FilterChip
              label={`Personality: ${currentFilters.personality}`}
              onRemove={() => updateFilter("personality", null)}
            />
          )}
          {currentFilters.relationship && (
            <FilterChip
              label={`Relationship: ${currentFilters.relationship}`}
              onRemove={() => updateFilter("relationship", null)}
            />
          )}
          {currentFilters.occupation && (
            <FilterChip
              label={`Occupation: ${currentFilters.occupation}`}
              onRemove={() => updateFilter("occupation", null)}
            />
          )}
          {currentFilters.hobby && (
            <FilterChip
              label={`Interest: ${currentFilters.hobby}`}
              onRemove={() => updateFilter("hobby", null)}
            />
          )}
          {currentFilters.search && (
            <FilterChip
              label={`Search: ${currentFilters.search}`}
              onRemove={() => setSearchQuery("")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-600/20 text-pink-400 text-sm rounded-full border border-pink-500/30">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </span>
  );
}
