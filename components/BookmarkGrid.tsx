'use client'

import { useState, useCallback, useEffect } from 'react'
import { Bookmark } from '@/lib/types'
import BookmarkCard from './BookmarkCard'
import SearchBar from './SearchBar'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Props {
  initialBookmarks: Bookmark[]
  plan: string
  initialSite?: string
}

export default function BookmarkGrid({ initialBookmarks, plan, initialSite = '' }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [loading, setLoading] = useState(false)

  // Sync state with props when initialBookmarks changes from server navigation
  useEffect(() => {
    setBookmarks(initialBookmarks)
  }, [initialBookmarks])

  const handleSearch = useCallback(async (q: string, tag: string, site: string) => {
    if (!q && !tag) {
      setBookmarks(initialBookmarks)
      return
    }
    setLoading(true)
    const params = new URLSearchParams()
    if (q)    params.set('q', q)
    if (tag)  params.set('tag', tag)
    if (site) params.set('site', site)

    const res = await fetch(`/api/bookmarks?${params.toString()}`)
    const data = await res.json()
    setBookmarks(data.bookmarks || [])
    setLoading(false)
  }, [initialBookmarks])

  const handleDelete = async (id: string) => {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const handleUpdate = async (id: string, updates: Partial<Bookmark>) => {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.bookmark) {
      setBookmarks(prev => prev.map(b => b.id === id ? data.bookmark : b))
    }
  }

  // Collect all unique tags for filter chips
  const allTags = Array.from(new Set(bookmarks.flatMap(b => b.tags || []))).slice(0, 20)

  return (
    <div>
      <SearchBar onSearch={handleSearch} allTags={allTags} initialSite={initialSite} />

      {/* Free plan limit warning */}
      {plan === 'free' && bookmarks.length >= 8 && (
        <div className="flex items-center justify-between p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <p className="text-sm text-zinc-300">
              {bookmarks.length >= 10
                ? 'You\'ve reached the 10 bookmark limit on the free plan.'
                : `${10 - bookmarks.length} bookmark${10 - bookmarks.length === 1 ? '' : 's'} remaining on free plan.`}
            </p>
          </div>
          <Link href="/settings" className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition whitespace-nowrap ml-4">
            Upgrade →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No bookmarks found</p>
          <p className="text-zinc-600 text-sm mt-1">Save a video using the Chrome extension to see it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bookmarks.map(bookmark => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
