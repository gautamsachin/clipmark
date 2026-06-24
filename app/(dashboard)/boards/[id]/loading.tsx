import { Loader2 } from 'lucide-react'

export default function BoardLoading() {
  return (
    <div className="flex flex-1 w-full border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl min-h-0 h-full flex-col animate-pulse">
      {/* Canvas Toolbar Header Placeholder */}
      <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-950/40 z-10 select-none">
        <div className="flex items-center gap-3">
          <div>
            <div className="h-5 w-32 bg-zinc-800 rounded-md mb-1.5" />
            <div className="h-3 w-48 bg-zinc-850/60 rounded-md" />
          </div>
          <div className="flex items-center gap-1.5 pl-4 border-l border-zinc-800">
            <div className="h-7 w-20 bg-zinc-800 rounded-lg" />
            <div className="h-7 w-20 bg-zinc-800 rounded-lg" />
            <div className="h-7 w-24 bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-24 bg-zinc-800 rounded-lg" />
          <div className="h-7 w-16 bg-zinc-800 rounded-lg" />
        </div>
      </div>

      {/* Canvas Body Placeholder */}
      <div className="flex-1 bg-[#070708] relative bg-[radial-gradient(#1e1e24_1.2px,transparent_1.2px)] [background-size:24px_24px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <span className="text-sm font-medium text-zinc-400">Loading board canvas...</span>
        </div>
      </div>
    </div>
  )
}
