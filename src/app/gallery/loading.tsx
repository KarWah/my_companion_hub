export default function GalleryLoading() {
  return (
    <div className="p-8">
      <div className="h-10 w-48 bg-slate-800 rounded-lg animate-pulse mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="aspect-[3/4] bg-slate-950 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-6 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
