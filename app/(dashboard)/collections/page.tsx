'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import Link from 'next/link'

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetch('/api/collections').then(r => r.json()).then(d => setCollections(d.collections || []))
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
    const data = await res.json()
    if (data.collection) { setCollections(p => [...p, data.collection]); setName(''); setCreating(false) }
  }

  const update = async (id: string) => {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    const data = await res.json()
    if (data.collection) { setCollections(p => p.map(c => c.id === id ? data.collection : c)); setEditingId(null) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete collection? Bookmarks will not be deleted.')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    setCollections(p => p.filter(c => c.id !== id))
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Collections</h1>
        <p className="text-zinc-500 text-sm mt-1">Organise bookmarks into folders</p>
      </div>

      {!creating ? (
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/20 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> New Collection
        </button>
      ) : (
        <form onSubmit={create} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 max-w-sm">
          <p className="text-white font-semibold mb-3">New Collection</p>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Collection name…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500 transition mb-3" />
          <div className="flex gap-2 mb-3">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!name.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold py-2 rounded-xl transition-all">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white active:scale-[0.98] text-zinc-400 text-sm rounded-xl transition-all">Cancel</button>
          </div>
        </form>
      )}

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 font-medium">No collections yet</p>
          <p className="text-zinc-600 text-sm mt-1">Create a collection to organise your bookmarks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(col => (
            <div key={col.id} className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: col.color + '22', border: `1px solid ${col.color}44` }}>
                  <FolderOpen className="w-4 h-4" style={{ color: col.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === col.id ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-violet-500" />
                      <button onClick={() => update(col.id)} className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <p className="text-white font-medium text-sm truncate">{col.name}</p>
                  )}
                </div>
                {editingId !== col.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setEditingId(col.id); setEditName(col.name) }} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(col.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
