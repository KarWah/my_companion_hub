export default function NewCompanionLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-64 bg-slate-800 rounded animate-pulse mb-2"></div>
        <div className="h-5 w-96 bg-slate-800 rounded animate-pulse"></div>
      </div>

      {/* Form skeleton */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="space-y-6">
          {/* Name field */}
          <div>
            <div className="h-5 w-20 bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-slate-800 rounded animate-pulse"></div>
          </div>

          {/* Description field */}
          <div>
            <div className="h-5 w-32 bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-32 w-full bg-slate-800 rounded animate-pulse"></div>
          </div>

          {/* Visual Description field */}
          <div>
            <div className="h-5 w-40 bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-32 w-full bg-slate-800 rounded animate-pulse"></div>
          </div>

          {/* Default Outfit field */}
          <div>
            <div className="h-5 w-32 bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-slate-800 rounded animate-pulse"></div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <div className="h-10 w-32 bg-slate-800 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-slate-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
