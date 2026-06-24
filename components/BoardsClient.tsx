'use client'

import { useState } from 'react'
import { Board } from '@/lib/types'
import Link from 'next/link'
import { Plus, Layout, Lock, Globe, Trash2, LogOut } from 'lucide-react'

export default function BoardsClient({ initialBoards, userId }: { initialBoards: any[], userId: string }) {
  const [boards, setBoards] = useState<any[]>(initialBoards)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    const data = await res.json()
    if (data.board) {
      setBoards(prev => [{ ...data.board, board_items: [{ count: 0 }], is_owner: true }, ...prev])
      setTitle(''); setDescription(''); setCreating(false)
    }
    setLoading(false)
  }

  const deleteBoard = async (id: string) => {
    if (!confirm('Delete this board? This won\'t delete your bookmarks.')) return
    await fetch(`/api/boards/${id}`, { method: 'DELETE' })
    setBoards(prev => prev.filter(b => b.id !== id))
  }

  const leaveBoard = async (id: string) => {
    if (!confirm('Leave this shared board? You will lose access to it.')) return
    const res = await fetch(`/api/boards/${id}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setBoards(prev => prev.filter(b => b.id !== id))
    }
  }

  return (
    <div>
      {/* Create button */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/20 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> New Board
        </button>
      ) : (
        <form onSubmit={createBoard} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 max-w-md">
          <p className="text-white font-semibold mb-3">New Board</p>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Board title…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500 transition mb-2"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)…"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-violet-500 transition mb-3 resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold py-2 rounded-xl transition-all">
              {loading ? 'Creating…' : 'Create Board'}
            </button>
            <button type="button" onClick={() => setCreating(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white active:scale-[0.98] text-zinc-400 text-sm rounded-xl transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Board grid */}
      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <Layout className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No boards yet</p>
          <p className="text-zinc-600 text-sm mt-1">Create a moodboard or storyboard from your bookmarks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <div key={board.id} className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition">
              {/* Cover / placeholder */}
              <Link href={`/boards/${board.id}`}>
                <div className="aspect-video bg-gradient-to-br from-violet-900/40 to-indigo-900/40 flex items-center justify-center relative overflow-hidden cursor-pointer">
                  {board.cover_url ? (
                    <img src={board.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layout className="w-10 h-10 text-violet-400/40" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/boards/${board.id}`}>
                      <h3 className="text-white font-semibold text-sm truncate hover:text-violet-300 transition">{board.title}</h3>
                    </Link>
                    {board.description && (
                      <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{board.description}</p>
                    )}
                  </div>
                  {board.is_owner ? (
                    <button
                      onClick={() => deleteBoard(board.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition flex-shrink-0 cursor-pointer"
                      title="Delete Board"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => leaveBoard(board.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition flex-shrink-0 cursor-pointer"
                      title="Leave Board"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">
                      {board.board_items?.[0]?.count || 0} clips
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase leading-none ${
                      board.is_owner
                        ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                    }`}>
                      {board.is_owner ? 'Owner' : 'Collaborator'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-zinc-600">
                    {board.is_public
                      ? <><Globe className="w-3 h-3" /> Public</>
                      : <><Lock className="w-3 h-3" /> Private</>}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
