import { ArrowLeft } from "lucide-react";

export default function CompanionGalleryLoading() {
  return (
    <div className="p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-slate-400 mb-4">
          <ArrowLeft size={20} />
          <span>Back to Gallery</span>
        </div>
        <div className="h-9 w-64 bg-slate-800 rounded-lg animate-pulse mb-2" />
        <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Images Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="aspect-[832/1216] bg-slate-950 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 bg-slate-800 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
