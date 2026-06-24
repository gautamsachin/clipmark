export default function BookmarksLoading() {
  return (
    <div className="animate-pulse w-full">
      {/* Header Placeholder */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-zinc-800 rounded-md mb-2" />
        <div className="h-4 w-24 bg-zinc-850/60 rounded-md" />
      </div>

      {/* Searchbar Placeholder */}
      <div className="mb-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="h-10 w-full md:w-80 bg-zinc-800 rounded-xl" />
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="h-7 w-16 bg-zinc-800 rounded-full" />
          <div className="h-7 w-20 bg-zinc-800 rounded-full" />
          <div className="h-7 w-14 bg-zinc-800 rounded-full" />
        </div>
      </div>

      {/* Grid Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-64">
            <div className="aspect-video bg-zinc-800 w-full" />
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="h-4 w-3/4 bg-zinc-800 rounded-md mb-2" />
                <div className="h-3 w-1/2 bg-zinc-850/60 rounded-md" />
              </div>
              <div className="h-3 w-1/3 bg-zinc-800 rounded-md mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
