'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface Props {
  onSearch: (q: string, tag: string, site: string) => void
  allTags: string[]
  initialSite?: string
}

export default function SearchBar({ onSearch, allTags, initialSite = '' }: Props) {
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const searchParams = useSearchParams()
  const site = searchParams ? searchParams.get('site') || '' : ''
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Clear search filters when category/site changes
  useEffect(() => {
    setQ('')
    setActiveTag('')
  }, [site])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    
    // If search text and active tag are empty, call onSearch synchronously to avoid debounce lag
    if (!q && !activeTag) {
      onSearch(q, activeTag, site)
      return
    }

    debounceRef.current = setTimeout(() => {
      onSearch(q, activeTag, site)
    }, 300)
    
    return () => clearTimeout(debounceRef.current)
  }, [q, activeTag, site, onSearch])

  const toggleTag = (tag: string) => {
    setActiveTag(prev => prev === tag ? '' : tag)
  }

  return (
    <div className="mb-6">
      {/* Search input */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search notes, tags…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-10 py-3 text-white placeholder-zinc-500 text-sm outline-none focus:border-violet-500 transition"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                activeTag === tag
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag('')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-500 hover:text-white transition flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
