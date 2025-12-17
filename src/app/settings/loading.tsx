export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-32 bg-slate-800 rounded animate-pulse"></div>
      </div>

      {/* Settings cards skeleton */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            {/* Card header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-slate-800 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-24 bg-slate-800 rounded animate-pulse"></div>
            </div>

            {/* Card content */}
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-800 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
