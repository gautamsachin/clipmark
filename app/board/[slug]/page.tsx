import { createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Clock, MonitorPlay, Film, Bookmark, ExternalLink } from 'lucide-react'

const formatTime = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }

export default async function PublicBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: board } = await admin.from('boards').select('*').eq('public_slug', slug).eq('is_public', true).single()
  if (!board) notFound()

  const { data: items } = await admin
    .from('board_items')
    .select('*, bookmark:bookmarks(*)')
    .eq('board_id', board.id)
    .order('position', { ascending: true })

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Bookmark className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="text-white font-bold">Clipmark</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Board title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">{board.title}</h1>
          {board.description && <p className="text-zinc-400 mt-2">{board.description}</p>}
          <p className="text-zinc-600 text-sm mt-2">{items?.length || 0} clips</p>
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(items || []).map((item, index) => {
            const bm = item.bookmark
            const Icon = bm?.site === 'youtube' ? MonitorPlay : Film
            const iconColor = bm?.site === 'youtube' ? 'text-red-400' : 'text-pink-400'
            const url = bm?.site === 'youtube' ? `${bm?.url}&t=${bm?.timestamp}` : bm?.url

            return (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  <div className="relative aspect-video bg-zinc-800 overflow-hidden hover:opacity-90 transition">
                    {bm?.screenshot_url ? (
                      <img src={bm.screenshot_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className={`w-8 h-8 ${iconColor} opacity-30`} />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-semibold">{formatTime(bm?.timestamp || 0)}</span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                  </div>
                </a>
                <div className="p-3">
                  {item.card_note && (
                    <p className="text-zinc-300 text-sm mb-3">{item.card_note}</p>
                  )}
                  {bm?.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {bm.tags.map((t: string) => (
                        <span key={t} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  )}
                  <a href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-400 transition mt-1">
                    <ExternalLink className="w-3 h-3" /> Watch at {formatTime(bm?.timestamp || 0)}
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-zinc-700 text-xs mt-16">
          Made with <a href="/" className="text-violet-500 hover:text-violet-400">Clipmark</a>
        </p>
      </div>
    </div>
  )
}
