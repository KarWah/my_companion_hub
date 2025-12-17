export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo skeleton */}
        <div className="text-center mb-8">
          <div className="h-10 w-10 bg-slate-800 rounded-lg mx-auto mb-4 animate-pulse"></div>
          <div className="h-8 w-64 bg-slate-800 rounded mx-auto animate-pulse"></div>
        </div>

        {/* Form card skeleton */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <div className="space-y-6">
            {/* Email field */}
            <div>
              <div className="h-5 w-16 bg-slate-800 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-full bg-slate-800 rounded animate-pulse"></div>
            </div>

            {/* Password field */}
            <div>
              <div className="h-5 w-24 bg-slate-800 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-full bg-slate-800 rounded animate-pulse"></div>
            </div>

            {/* Submit button */}
            <div className="h-11 w-full bg-slate-800 rounded animate-pulse"></div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800"></div>
              <div className="h-4 w-8 bg-slate-800 rounded animate-pulse"></div>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            {/* Link */}
            <div className="h-5 w-48 bg-slate-800 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
