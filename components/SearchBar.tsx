'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronDown, Check, Clock, CalendarDays, Calendar } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface Props {
  onSearch: (q: string, tag: string, site: string) => void
  allTags: string[]
  initialSite?: string
  sortBy: 'newest' | 'oldest' | 'timestamp'
  onSortChange: (sortBy: 'newest' | 'oldest' | 'timestamp') => void
}

export default function SearchBar({ onSearch, allTags, initialSite = '', sortBy, onSortChange }: Props) {
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const searchParams = useSearchParams()
  const site = searchParams ? searchParams.get('site') || '' : ''
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options = [
    { value: 'newest', label: 'Newest Saved', icon: CalendarDays },
    { value: 'oldest', label: 'Oldest Saved', icon: Calendar },
    { value: 'timestamp', label: 'Video Timestamp', icon: Clock }
  ] as const

  const activeOption = options.find(o => o.value === sortBy) || options[0]
  const ActiveIcon = activeOption.icon

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
      {/* Search input and Sort selector */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
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

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-violet-500 transition cursor-pointer select-none hover:border-zinc-700 h-full min-w-[170px] justify-between shadow-md"
          >
            <span className="flex items-center gap-2.5">
              <ActiveIcon className="w-4 h-4 text-violet-400" />
              {activeOption.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col gap-0.5">
                {options.map(opt => {
                  const OptIcon = opt.icon
                  const isSelected = opt.value === sortBy
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onSortChange(opt.value)
                        setDropdownOpen(false)
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer w-full text-left ${
                        isSelected
                          ? 'bg-violet-600/20 text-violet-350'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-400' : 'text-zinc-500'}`} />
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
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
