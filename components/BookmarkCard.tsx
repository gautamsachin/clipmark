'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from '@/lib/types'
import { Trash2, ExternalLink, Clock, Edit2, Check, X, MonitorPlay, Film, BookmarkIcon } from 'lucide-react'

interface Props {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Bookmark>) => void
}

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function BookmarkCard({ bookmark, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(bookmark.notes || '')
  const [tags, setTags] = useState<string[]>(bookmark.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [collections, setCollections] = useState<any[]>([])
  const [boards, setBoards] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>(bookmark.collection_id || '')
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  useEffect(() => {
    if (!editing) return
    const fetchData = async () => {
      setLoadingOrgs(true)
      try {
        const [collectionsRes, boardsRes, bookmarkBoardsRes] = await Promise.all([
          fetch('/api/collections'),
          fetch('/api/boards'),
          fetch(`/api/bookmarks/${bookmark.id}/boards`)
        ])
        
        const collectionsData = await collectionsRes.json()
        const boardsData = await boardsRes.json()
        const bookmarkBoardsData = await bookmarkBoardsRes.json()

        setCollections(collectionsData.collections || [])
        setBoards(boardsData.boards || [])
        setSelectedBoards(bookmarkBoardsData.boardIds || [])
      } catch (err) {
        console.error('Failed to load collections/boards:', err)
      } finally {
        setLoadingOrgs(false)
      }
    }
    fetchData()
  }, [editing, bookmark.id])

  const openUrl = () => {
    const url = bookmark.site === 'youtube'
      ? `${bookmark.url}&t=${bookmark.timestamp}`
      : bookmark.url
    window.open(url, '_blank')
  }

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(bookmark.id, { notes, tags, collection_id: selectedCollection || null })
    try {
      await fetch(`/api/bookmarks/${bookmark.id}/boards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardIds: selectedBoards })
      })
    } catch (err) {
      console.error('Failed to save board items:', err)
    }
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setNotes(bookmark.notes || '')
    setTags(bookmark.tags || [])
    setTagInput('')
    setSelectedCollection(bookmark.collection_id || '')
    setEditing(false)
  }

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim().replace(/^#/, '').replace(/,/g, '')
      if (val && !tags.includes(val)) setTags(prev => [...prev, val])
      setTagInput('')
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  const SiteIcon = bookmark.site === 'youtube' ? MonitorPlay : Film
  const siteColor = bookmark.site === 'youtube' ? 'text-red-400' : 'text-pink-400'

  return (
    <>
      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition flex flex-col">

        {/* Screenshot / Thumbnail */}
        <div className="relative aspect-video bg-zinc-800 overflow-hidden cursor-pointer" onClick={openUrl}>
          {bookmark.screenshot_url ? (
            <img src={bookmark.screenshot_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SiteIcon className={`w-8 h-8 ${siteColor} opacity-30`} />
            </div>
          )}
          {/* Timestamp overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-semibold">{formatTime(bookmark.timestamp)}</span>
          </div>
          {/* Site badge */}
          <div className="absolute top-2 right-2">
            <SiteIcon className={`w-4 h-4 ${siteColor} drop-shadow`} />
          </div>
          {/* Open overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ExternalLink className="w-6 h-6 text-white drop-shadow" />
          </div>
        </div>

        {/* Card body */}
        <div className="p-3 flex flex-col flex-1">
          {/* Video ID + time */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-mono truncate max-w-[140px]">{bookmark.video_id}</span>
            <span className="text-xs text-zinc-600">{timeAgo(bookmark.saved_at)}</span>
          </div>

          {/* Note preview */}
          {(bookmark.notes || notes) && !editing && (
            <p className="text-zinc-400 text-xs mb-2 line-clamp-2 italic">{bookmark.notes}</p>
          )}

          {/* Tags preview */}
          {(bookmark.tags?.length ?? 0) > 0 && !editing && (
            <div className="flex flex-wrap gap-1 mb-2">
              {bookmark.tags!.map(t => (
                <span key={t} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-1 mt-auto pt-2 border-t border-zinc-800">
            <button
              onClick={openUrl}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-white py-1 rounded-lg hover:bg-zinc-800 transition"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            {confirmDelete ? (
              <>
                <span className="text-xs text-zinc-400 px-1">Sure?</span>
                <button onClick={() => onDelete(bookmark.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg transition font-medium">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500 px-1">No</button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Drawer Modal ─────────────────────────────────────────── */}
      {editing && (
        <>
          <style>{`
            @keyframes cmFadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes cmSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
            .cm-backdrop { animation: cmFadeIn 0.2s ease both; }
            .cm-drawer  { animation: cmSlideIn 0.25s cubic-bezier(0.32,0.72,0,1) both; }
          `}</style>

          {/* Backdrop */}
          <div
            className="cm-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleCancel}
          />

          {/* Drawer panel — slides in from right */}
          <div className="cm-drawer fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <BookmarkIcon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Edit Bookmark</h2>
                  <p className="text-xs text-zinc-500 font-mono">{bookmark.video_id}</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

              {/* Thumbnail preview */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-zinc-900 border border-zinc-800">
                {bookmark.screenshot_url ? (
                  <img src={bookmark.screenshot_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <SiteIcon className={`w-12 h-12 ${siteColor} opacity-20`} />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-sm font-semibold">{formatTime(bookmark.timestamp)}</span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-black/60 ${siteColor}`}>
                    <SiteIcon className="w-3 h-3" />
                    {bookmark.site === 'youtube' ? 'YouTube' : 'Instagram'}
                  </span>
                </div>
              </div>

              {/* Notes field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add a note about this video…"
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm resize-none outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition placeholder-zinc-600 leading-relaxed"
                />
              </div>

              {/* Tags field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tags</label>
                <div
                  className="flex flex-wrap gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 cursor-text focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/30 transition min-h-[50px] items-start"
                  onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
                >
                  {tags.map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm px-3 py-1 rounded-full">
                      #{t}
                      <button
                        onClick={() => setTags(prev => prev.filter((_, j) => j !== i))}
                        className="text-violet-400 hover:text-violet-200 transition leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder={tags.length ? 'Add more…' : '# fitness, travel…'}
                    className="flex-1 min-w-[100px] bg-transparent text-white text-sm outline-none placeholder-zinc-600"
                  />
                </div>
                <p className="text-xs text-zinc-600">Press Enter or comma to add a tag</p>
              </div>

              {/* Collection select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Folder Collection</label>
                {loadingOrgs ? (
                  <div className="h-11 bg-zinc-900 border border-zinc-850 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedCollection}
                    onChange={e => setSelectedCollection(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition appearance-none cursor-pointer"
                  >
                    <option value="">None (Unorganized)</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Boards multi-select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Moodboards</label>
                {loadingOrgs ? (
                  <div className="h-24 bg-zinc-900 border border-zinc-850 rounded-xl animate-pulse" />
                ) : boards.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-500">No boards created yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-h-48 overflow-y-auto">
                    {boards.map(b => {
                      const checked = selectedBoards.includes(b.id)
                      return (
                        <label key={b.id} className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setSelectedBoards(prev => prev.filter(id => id !== b.id))
                              } else {
                                setSelectedBoards(prev => [...prev, b.id])
                              }
                            }}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-850 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-900"
                          />
                          <span className="truncate">{b.title}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* URL row */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Source</label>
                <button
                  onClick={openUrl}
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-left truncate transition group/link"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition" />
                  <span className="truncate">{bookmark.url}</span>
                </button>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-5 border-t border-zinc-800 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-2 flex-[2] py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
