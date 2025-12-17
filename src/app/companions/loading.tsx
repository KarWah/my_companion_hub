export default function CompanionsLoading() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        {/* Title skeleton */}
        <div className="h-9 w-48 bg-slate-800 rounded animate-pulse"></div>
        {/* Button skeleton */}
        <div className="h-10 w-40 bg-slate-800 rounded animate-pulse"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Image skeleton */}
            <div className="aspect-[3/4] bg-slate-800 animate-pulse"></div>
            {/* Content skeleton */}
            <div className="p-4">
              <div className="h-6 w-3/4 bg-slate-800 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-full bg-slate-800 rounded mb-1 animate-pulse"></div>
              <div className="h-4 w-2/3 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
