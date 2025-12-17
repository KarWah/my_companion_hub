export default function GenerateLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="h-9 w-64 bg-slate-800 rounded-lg animate-pulse mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls Skeleton */}
        <div className="space-y-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
              <div className="h-12 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>

        {/* Preview Skeleton */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="h-7 w-24 bg-slate-800 rounded animate-pulse mb-4" />
          <div className="aspect-[832/1216] bg-slate-950 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
