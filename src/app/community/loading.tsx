export default function CommunityLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-9 w-48 bg-slate-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Filters skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-24 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-slate-800 rounded-lg animate-pulse" />
      </div>

      {/* Results count skeleton */}
      <div className="h-5 w-32 bg-slate-800 rounded animate-pulse mb-6" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border bg-slate-800 border-slate-700"
          >
            <div className="aspect-[3/4] rounded-xl bg-slate-700 animate-pulse mb-4" />
            <div className="space-y-2">
              <div className="h-6 w-3/4 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-700/50 rounded animate-pulse" />
              <div className="flex gap-2 mt-2">
                <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
                <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
