'use client'

import { useState, useRef, useEffect } from 'react'
import { Board, BoardItem, Bookmark } from '@/lib/types'
import { 
  Clock, MonitorPlay, Film, Plus, Trash2, GripVertical, 
  Globe, Lock, ExternalLink, Edit2, Check, X, Share2, 
  Copy, MessageSquare, UserPlus, Users, Search, Notebook,
  Type, MoveRight, HelpCircle, ZoomIn, ZoomOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'

interface Props {
  board: Board
  initialItems: any[]
  allBookmarks: Bookmark[]
  userId: string
}

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']
const STICKY_COLORS = [
  { name: 'Yellow', bg: 'bg-yellow-950/40 border-yellow-800/40 text-yellow-100', hex: '#fef08a' },
  { name: 'Green', bg: 'bg-green-950/40 border-green-800/40 text-green-100', hex: '#bbf7d0' },
  { name: 'Pink', bg: 'bg-pink-950/40 border-pink-800/40 text-pink-100', hex: '#fbcfe8' },
  { name: 'Blue', bg: 'bg-sky-950/40 border-sky-800/40 text-sky-100', hex: '#bae6fd' },
  { name: 'Gray', bg: 'bg-zinc-900/60 border-zinc-800 text-zinc-100', hex: '#e4e4e7' }
]

const formatTime = (s: number) => { 
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s` 
}

export default function BoardEditor({ board, initialItems, allBookmarks, userId }: Props) {
  const router = useRouter()
  
  // Data states
  const [items, setItems] = useState<any[]>(initialItems)
  const [boardData, setBoardData] = useState(board)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null) // Selected item details sidebar
  const [zoom, setZoom] = useState<number>(1.0)
  
  // Infinite Canvas layout state
  const [canvas, setCanvas] = useState<any>(() => {
    const defaultCanvas = { items: {}, notes: [], arrows: [] }
    if (!board.canvas_data) return defaultCanvas
    return {
      items: board.canvas_data.items || {},
      notes: board.canvas_data.notes || [],
      arrows: board.canvas_data.arrows || []
    }
  })

  // Picker modal
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // Collaboration / Member states
  const [members, setMembers] = useState<any[]>([])
  const [owner, setOwner] = useState<any | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviting, setInviting] = useState(false)

  // Arrow connection mode state
  const [arrowMode, setArrowMode] = useState<{
    step: 'idle' | 'select_source' | 'select_target'
    fromId?: string
    fromType?: 'item' | 'note'
  }>({ step: 'idle' })

  // Dragging interaction state
  const [dragging, setDragging] = useState<{
    id: string
    type: 'item' | 'note'
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  // Comments states
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [postingComment, setPostingComment] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync state when active board shifts
  useEffect(() => {
    setBoardData(board)
    setItems(initialItems)
    setSelectedItemId(null)
    
    const defaultCanvas = { items: {}, notes: [], arrows: [] }
    if (!board.canvas_data) {
      setCanvas(defaultCanvas)
    } else {
      setCanvas({
        items: board.canvas_data.items || {},
        notes: board.canvas_data.notes || [],
        arrows: board.canvas_data.arrows || []
      })
    }
  }, [board.id, initialItems])

  // Fetch comments when selecting active card
  useEffect(() => {
    if (!selectedItemId) {
      setComments([])
      return
    }
    const fetchComments = async () => {
      setLoadingComments(true)
      try {
        const res = await fetch(`/api/boards/${board.id}/items/${selectedItemId}/comments`)
        const data = await res.json()
        if (data.comments) setComments(data.comments)
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setLoadingComments(false)
      }
    }
    fetchComments()
  }, [selectedItemId, board.id])

  // Fetch board members
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/boards/${board.id}/members`)
      const data = await res.json()
      if (data.members) setMembers(data.members)
      if (data.owner) setOwner(data.owner)
    } catch (err) {
      console.error('Failed to fetch board members:', err)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [board.id])

  // ── Database Persistance ──────────────────────────────────────────────────
  const persistCanvasData = (currentCanvas: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/boards/${board.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canvas_data: currentCanvas })
        })
      } catch (err) {
        console.error('Failed to save canvas:', err)
      }
    }, 800)
  }

  // ── Invite Collaborator ───────────────────────────────────────────────────
  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      const res = await fetch(`/api/boards/${board.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Failed to invite user')
      } else {
        setInviteSuccess(`Successfully invited ${inviteEmail}!`)
        setInviteEmail('')
        fetchMembers()
      }
    } catch (err) {
      setInviteError('Network error occurred.')
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberUserId: string) => {
    if (!confirm('Remove this collaborator from the board?')) return
    try {
      const res = await fetch(`/api/boards/${board.id}/members/${memberUserId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  // ── Toggle Board Privacy ──────────────────────────────────────────────────
  const togglePublic = async () => {
    const res = await fetch(`/api/boards/${board.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: boardData.title, description: boardData.description, is_public: !boardData.is_public }),
    })
    const data = await res.json()
    if (data.board) setBoardData(data.board)
  }

  // ── Draggable Card Positions update ──────────────────────────────────────
  const updatePositionLocal = (id: string, type: 'item' | 'note', x: number, y: number) => {
    setCanvas((prev: any) => {
      if (type === 'item') {
        const updatedItems = { ...prev.items, [id]: { x, y } }
        return { ...prev, items: updatedItems }
      } else {
        const updatedNotes = prev.notes.map((n: any) => n.id === id ? { ...n, x, y } : n)
        return { ...prev, notes: updatedNotes }
      }
    })
  }

  // ── Drag & Drop mouse handlers ────────────────────────────────────────────
  const startDrag = (id: string, type: 'item' | 'note', e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) return
    e.preventDefault()

    let origX = 100
    let origY = 100

    if (type === 'item') {
      const pos = canvas.items?.[id] || { x: 100, y: 100 }
      origX = pos.x
      origY = pos.y
    } else {
      const note = canvas.notes?.find((n: any) => n.id === id)
      if (note) {
        origX = note.x
        origY = note.y
      }
    }

    setDragging({
      id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX,
      origY
    })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    e.preventDefault()
    const dx = (e.clientX - dragging.startX) / zoom
    const dy = (e.clientY - dragging.startY) / zoom
    
    // Clamp to canvas workspace limits
    const newX = Math.max(10, Math.min(2100, dragging.origX + dx))
    const newY = Math.max(10, Math.min(1500, dragging.origY + dy))

    updatePositionLocal(dragging.id, dragging.type, newX, newY)
  }

  const onMouseUp = () => {
    if (dragging) {
      setDragging(null)
      persistCanvasData(canvas)
    }
  }

  // ── Add Bookmark Clip ─────────────────────────────────────────────────────
  const handleAddBookmark = async (bookmarkId: string) => {
    const res = await fetch(`/api/boards/${board.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmark_id: bookmarkId }),
    })
    const data = await res.json()
    if (data.item) {
      setItems(prev => [...prev, data.item])
      
      // Assign default positioning coordinates
      setCanvas((prev: any) => {
        const updatedItems = { ...prev.items, [data.item.id]: { x: 120, y: 120 } }
        const updated = { ...prev, items: updatedItems }
        persistCanvasData(updated)
        return updated
      })
      setShowPicker(false)
    }
  }

  // ── Remove Bookmark Clip ──────────────────────────────────────────────────
  const removeBookmark = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove this clip from the canvas?')) return
    await fetch(`/api/boards/${board.id}/items/${itemId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== itemId))
    
    setCanvas((prev: any) => {
      const nextItems = { ...prev.items }
      delete nextItems[itemId]
      const nextArrows = prev.arrows.filter((a: any) => a.fromId !== itemId && a.toId !== itemId)
      const updated = { ...prev, items: nextItems, arrows: nextArrows }
      persistCanvasData(updated)
      return updated
    })

    if (selectedItemId === itemId) {
      setSelectedItemId(null)
    }
  }

  // ── Create Sticky Note ────────────────────────────────────────────────────
  const addStickyNote = () => {
    const noteId = 'note_' + nanoid()
    const newNote = {
      id: noteId,
      x: 450,
      y: 120,
      text: 'Click here to write text note…',
      color: '#bae6fd' // light blue default
    }
    setCanvas((prev: any) => {
      const nextNotes = [...(prev.notes || []), newNote]
      const updated = { ...prev, notes: nextNotes }
      persistCanvasData(updated)
      return updated
    })
  }

  // ── Update Sticky Note details ───────────────────────────────────────────
  const updateStickyNoteText = (noteId: string, text: string) => {
    setCanvas((prev: any) => {
      const nextNotes = prev.notes.map((n: any) => n.id === noteId ? { ...n, text } : n)
      const updated = { ...prev, notes: nextNotes }
      persistCanvasData(updated)
      return updated
    })
  }

  const updateStickyNoteColor = (noteId: string, colorHex: string) => {
    setCanvas((prev: any) => {
      const nextNotes = prev.notes.map((n: any) => n.id === noteId ? { ...n, color: colorHex } : n)
      const updated = { ...prev, notes: nextNotes }
      persistCanvasData(updated)
      return updated
    })
  }

  const updateStickyNoteSize = (noteId: string, size: 's' | 'm' | 'l') => {
    setCanvas((prev: any) => {
      const nextNotes = prev.notes.map((n: any) => n.id === noteId ? { ...n, size } : n)
      const updated = { ...prev, notes: nextNotes }
      persistCanvasData(updated)
      return updated
    })
  }

  const duplicateStickyNote = (originalNote: any) => {
    const noteId = 'note_' + nanoid()
    let w = 220
    if (originalNote.size === 's') w = 160
    else if (originalNote.size === 'l') w = 320

    const newNote = {
      id: noteId,
      x: Math.min(2100, originalNote.x + w + 20),
      y: originalNote.y,
      text: originalNote.text,
      color: originalNote.color,
      size: originalNote.size || 'm'
    }

    setCanvas((prev: any) => {
      const nextNotes = [...(prev.notes || []), newNote]
      const updated = { ...prev, notes: nextNotes }
      persistCanvasData(updated)
      return updated
    })
  }

  const deleteStickyNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this text note?')) return
    setCanvas((prev: any) => {
      const nextNotes = prev.notes.filter((n: any) => n.id !== noteId)
      const nextArrows = prev.arrows.filter((a: any) => a.fromId !== noteId && a.toId !== noteId)
      const updated = { ...prev, notes: nextNotes, arrows: nextArrows }
      persistCanvasData(updated)
      return updated
    })
  }

  // ── Edit Card Scene Note directly ─────────────────────────────────────────
  const saveCardSceneNote = async (itemId: string, text: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, card_note: text } : i))
    try {
      await fetch(`/api/boards/${board.id}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_note: text }),
      })
    } catch (err) {
      console.error('Failed to save scene note:', err)
    }
  }

  // ── Arrow connection drawing triggers ─────────────────────────────────────
  const enterArrowMode = () => {
    setArrowMode({ step: 'select_source' })
  }

  const handleNodeClick = (id: string, type: 'item' | 'note') => {
    if (arrowMode.step === 'select_source') {
      setArrowMode({ step: 'select_target', fromId: id, fromType: type })
    } else if (arrowMode.step === 'select_target') {
      if (arrowMode.fromId === id) {
        setArrowMode({ step: 'idle' })
        return
      }
      
      const newArrow = {
        id: 'arrow_' + nanoid(),
        fromId: arrowMode.fromId!,
        fromType: arrowMode.fromType!,
        toId: id,
        toType: type
      }

      setCanvas((prev: any) => {
        const nextArrows = [...(prev.arrows || []), newArrow]
        const updated = { ...prev, arrows: nextArrows }
        persistCanvasData(updated)
        return updated
      })

      setArrowMode({ step: 'idle' })
    }
  }

  const deleteArrow = (arrowId: string) => {
    setCanvas((prev: any) => {
      const nextArrows = prev.arrows.filter((a: any) => a.id !== arrowId)
      const updated = { ...prev, arrows: nextArrows }
      persistCanvasData(updated)
      return updated
    })
  }

  // ── Connection Line calculations ──────────────────────────────────────────
  const getElementRect = (id: string, type: 'item' | 'note') => {
    if (type === 'item') {
      const pos = canvas.items?.[id] || { x: 120, y: 120 }
      return { x: pos.x, y: pos.y, w: 280, h: 220 }
    } else {
      const note = canvas.notes?.find((n: any) => n.id === id)
      const x = note?.x ?? 200
      const y = note?.y ?? 200
      let w = 220
      let h = 160
      if (note?.size === 's') {
        w = 160
        h = 110
      } else if (note?.size === 'l') {
        w = 320
        h = 220
      }
      return { x, y, w, h }
    }
  }

  const getEdgeConnectionPoints = (
    fromRect: { x: number, y: number, w: number, h: number }, 
    toRect: { x: number, y: number, w: number, h: number }
  ) => {
    const fromCenter = { x: fromRect.x + fromRect.w / 2, y: fromRect.y + fromRect.h / 2 }
    const toCenter = { x: toRect.x + toRect.w / 2, y: toRect.y + toRect.h / 2 }

    const start = { x: fromCenter.x, y: fromCenter.y }
    const end = { x: toCenter.x, y: toCenter.y }

    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        start.x = fromRect.x + fromRect.w
        end.x = toRect.x
      } else {
        start.x = fromRect.x
        end.x = toRect.x + toRect.w
      }
    } else {
      if (dy > 0) {
        start.y = fromRect.y + fromRect.h
        end.y = toRect.y
      } else {
        start.y = fromRect.y
        end.y = toRect.y + toRect.h
      }
    }
    return { start, end }
  }

  // ── Post Comment ──────────────────────────────────────────────────────────
  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedItemId) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/boards/${board.id}/items/${selectedItemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment.trim() })
      })
      const data = await res.json()
      if (data.comment) {
        setComments(prev => [...prev, data.comment])
        setNewComment('')
        setItems(prev => prev.map(i => {
          if (i.id === selectedItemId) {
            const currentCount = i.comments_count ?? i.comments?.[0]?.count ?? 0
            return { ...i, comments_count: currentCount + 1 }
          }
          return i
        }))
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setPostingComment(false)
    }
  }

  // ── Delete Comment ────────────────────────────────────────────────────────
  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      const res = await fetch(`/api/boards/${board.id}/items/${selectedItemId}/comments/${commentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        setItems(prev => prev.map(i => {
          if (i.id === selectedItemId) {
            const currentCount = i.comments_count ?? i.comments?.[0]?.count ?? 0
            return { ...i, comments_count: Math.max(0, currentCount - 1) }
          }
          return i
        }))
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  // Copy share URL
  const copyShareLink = () => {
    const url = `${window.location.origin}/board/${boardData.public_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Embed helpers
  const getEmbedUrl = (bookmark: Bookmark) => {
    if (bookmark.site === 'youtube') {
      return `https://www.youtube.com/embed/${bookmark.video_id}?start=${bookmark.timestamp}&autoplay=1`
    } else {
      return `https://www.instagram.com/p/${bookmark.video_id}/embed/`
    }
  }



  const filteredBookmarks = allBookmarks.filter(b => {
    const alreadyAdded = items.some(i => i.bookmark_id === b.id)
    if (alreadyAdded) return false
    if (!pickerSearch) return true
    return (
      b.video_id.includes(pickerSearch) ||
      b.notes?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      b.tags?.some(t => t.toLowerCase().includes(pickerSearch.toLowerCase()))
    )
  })

  const isBoardOwner = boardData.user_id === userId
  const isEditorCollaborator = members.some(m => m.profiles.id === userId && m.role === 'editor')
  const canModify = isBoardOwner || isEditorCollaborator

  // Find active selected card details
  const activeDetailItem = items.find(i => i.id === selectedItemId)

  return (
    <div className="flex flex-1 w-full border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl min-h-0">
      


      {/* ── VISUAL FREEFORM CANVAS VIEWPORT ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Canvas Toolbar Header */}
        <div className="px-6 py-3.5 border-b border-zinc-850 flex items-center justify-between gap-4 bg-zinc-950/40 z-10 select-none">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-white font-bold text-sm flex items-center gap-1.5">{boardData.title}</h1>
              {boardData.description && (
                <p className="text-zinc-500 text-[10px] truncate max-w-sm">{boardData.description}</p>
              )}
            </div>

            {/* Canvas toolbox items */}
            {canModify && (
              <div className="flex items-center gap-1.5 pl-4 border-l border-zinc-800">
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Clip
                </button>

                <button
                  onClick={addStickyNote}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 active:scale-95 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg transition-all cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-sky-400" /> Add Note
                </button>

                <button
                  onClick={enterArrowMode}
                  className={`flex items-center gap-1 px-2.5 py-1.5 active:scale-95 border rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                    arrowMode.step !== 'idle'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <MoveRight className="w-3.5 h-3.5 text-violet-400" /> Connect Arrow
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-850 rounded-xl p-0.5 ml-2.5 shadow-sm shadow-black/40">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                className="w-7 h-7 flex items-center justify-center bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg active:scale-90 transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-200 text-xs font-mono font-semibold px-2 min-w-[44px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
                className="w-7 h-7 flex items-center justify-center bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg active:scale-90 transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-zinc-800 mx-1.5" />
              <button
                type="button"
                onClick={() => setZoom(1.0)}
                className="px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-lg active:scale-95 transition-all cursor-pointer"
                title="Reset Zoom to 100%"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Collaborators widget */}
            <div className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg px-2.5 py-1">
              <div className="flex -space-x-1.5 overflow-hidden">
                {owner && (
                  <div
                    key={owner.id}
                    title={`Owner: ${owner.email}`}
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white uppercase flex-shrink-0"
                  >
                    {owner.full_name?.[0] || owner.email?.[0] || 'O'}
                  </div>
                )}
                {members.slice(0, 2).map(m => (
                  <div
                    key={m.profiles.id}
                    title={`${m.profiles.email} (${m.role})`}
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 uppercase flex-shrink-0"
                  >
                    {m.profiles.full_name?.[0] || m.profiles.email?.[0] || 'U'}
                  </div>
                ))}
                {members.length > 2 && (
                  <div className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 bg-zinc-800 flex items-center justify-center text-[8px] font-semibold text-zinc-400 flex-shrink-0">
                    +{members.length - 2}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-[10px] text-zinc-400 hover:text-white transition font-semibold ml-1 pl-1.5 border-l border-zinc-800 flex items-center gap-0.5 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" /> Invite
              </button>
            </div>

            {/* Sharing */}
            <button
              onClick={togglePublic}
              disabled={!isBoardOwner}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                boardData.is_public
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
              }`}
            >
              {boardData.is_public ? <><Globe className="w-3.5 h-3.5" /> Public</> : <><Lock className="w-3.5 h-3.5" /> Private</>}
            </button>

            {boardData.is_public && (
              <button 
                onClick={copyShareLink} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Share</>}
              </button>
            )}
          </div>
        </div>

        {/* Arrow mode banner status */}
        {arrowMode.step !== 'idle' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/90 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-3 z-30 shadow-lg select-none">
            <span>
              {arrowMode.step === 'select_source' 
                ? '🔗 Select source card or note to connect from' 
                : '🎯 Select target card or note to connect to'}
            </span>
            <button 
              onClick={() => setArrowMode({ step: 'idle' })}
              className="bg-black/20 hover:bg-black/35 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Infinite Canvas Frame */}
        <div 
          className="flex-1 overflow-auto bg-[#070708] relative custom-scrollbar"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Resizer container to adjust scroll boundaries */}
          <div 
            style={{ 
              width: `${2400 * zoom}px`, 
              height: `${1800 * zoom}px`,
              transition: 'width 0.1s ease-out, height 0.1s ease-out'
            }} 
            className="relative select-none"
          >
            {/* Scale container to scale elements visually */}
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: '2400px',
                height: '1800px',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              className="bg-[#070708] bg-[radial-gradient(#1e1e24_1.2px,transparent_1.2px)] [background-size:24px_24px]"
            >
            
            {/* ── CONNECTOR ARROWS SVG LAYER ────────────────────────────────── */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L6,3 Z" fill="#7c3aed" />
                </marker>
              </defs>
              
              {canvas.arrows?.map((arr: any) => {
                const hasFrom = (arr.fromType === 'item' && items.some(i => i.id === arr.fromId)) ||
                                (arr.fromType === 'note' && canvas.notes?.some((n: any) => n.id === arr.fromId))
                const hasTo = (arr.toType === 'item' && items.some(i => i.id === arr.toId)) ||
                              (arr.toType === 'note' && canvas.notes?.some((n: any) => n.id === arr.toId))

                if (!hasFrom || !hasTo) return null

                const r1 = getElementRect(arr.fromId, arr.fromType)
                const r2 = getElementRect(arr.toId, arr.toType)
                const { start, end } = getEdgeConnectionPoints(r1, r2)

                return (
                  <g key={arr.id}>
                    <path
                      d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                      stroke="#7c3aed"
                      strokeWidth="2.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      className="opacity-75"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Arrow deletion absolute buttons (needs to overlay on top of arrows, z-20) */}
            {canvas.arrows?.map((arr: any) => {
              const hasFrom = (arr.fromType === 'item' && items.some(i => i.id === arr.fromId)) ||
                              (arr.fromType === 'note' && canvas.notes?.some((n: any) => n.id === arr.fromId))
              const hasTo = (arr.toType === 'item' && items.some(i => i.id === arr.toId)) ||
                            (arr.toType === 'note' && canvas.notes?.some((n: any) => n.id === arr.toId))

              if (!hasFrom || !hasTo) return null

              const r1 = getElementRect(arr.fromId, arr.fromType)
              const r2 = getElementRect(arr.toId, arr.toType)
              const { start, end } = getEdgeConnectionPoints(r1, r2)
              const midX = (start.x + end.x) / 2
              const midY = (start.y + end.y) / 2

              return (
                <button
                  key={arr.id + '_del'}
                  onClick={() => deleteArrow(arr.id)}
                  disabled={!canModify}
                  style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)' }}
                  className="absolute bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 p-1 rounded-full shadow-md z-20 transition-all cursor-pointer opacity-0 hover:opacity-100 group-hover:opacity-100"
                  title="Remove Connection"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )
            })}

            {/* ── DRAGGABLE BOOKMARK CARDS (NODES) ──────────────────────────── */}
            {items.map(item => {
              const bm = item.bookmark
              if (!bm) return null
              const pos = canvas.items?.[item.id] || { x: 120, y: 120 }
              const Icon = bm.site === 'youtube' ? MonitorPlay : Film
              const iconColor = bm.site === 'youtube' ? 'text-red-400' : 'text-pink-400'
              
              const isConnectingActive = arrowMode.step !== 'idle'
              const isSelectedSource = arrowMode.fromId === item.id
              
              return (
                <div
                  key={item.id}
                  style={{ left: pos.x, top: pos.y, width: 280 }}
                  className={`absolute bg-zinc-900 border rounded-2xl overflow-hidden shadow-lg z-10 transition-shadow ${
                    dragging?.id === item.id && dragging?.type === 'item' ? 'shadow-2xl ring-2 ring-violet-500/50' : 'border-zinc-800'
                  } ${
                    isConnectingActive 
                      ? isSelectedSource 
                        ? 'ring-3 ring-amber-500' 
                        : 'hover:ring-3 hover:ring-violet-500 cursor-pointer'
                      : ''
                  }`}
                  onClick={() => {
                    if (isConnectingActive) {
                      handleNodeClick(item.id, 'item')
                    }
                  }}
                >
                  {/* Card Header (Grabbable) */}
                  <div 
                    onMouseDown={(e) => startDrag(item.id, 'item', e)}
                    className="px-3 py-2 bg-zinc-950/60 border-b border-zinc-850 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-400 font-mono truncate leading-none">{bm.video_id}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedItemId(item.id)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                        title="Discussion & Player"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                      {canModify && (
                        <button
                          onClick={(e) => removeBookmark(item.id, e)}
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition cursor-pointer"
                          title="Remove Card"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Thumbnail */}
                  <div className="relative aspect-video bg-zinc-950 flex items-center justify-center border-b border-zinc-850 group/thumb">
                    {bm.screenshot_url ? (
                      <img src={bm.screenshot_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={`w-10 h-10 ${iconColor} opacity-20`} />
                    )}
                    {/* Play timestamp trigger overlay */}
                    <button
                      onClick={() => setSelectedItemId(item.id)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
                        <MonitorPlay className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </button>
                    {/* Timestamp badge */}
                    <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-semibold text-white flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(bm.timestamp)}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                  </div>

                  {/* Card Content & Scene Notes inline */}
                  <div className="p-3 flex flex-col gap-2">
                    <p className="text-white text-xs font-semibold line-clamp-1 leading-snug">
                      {bm.title || 'Scene Clip'}
                    </p>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Scene Note</label>
                      <textarea
                        value={item.card_note || ''}
                        disabled={!canModify}
                        onChange={(e) => saveCardSceneNote(item.id, e.target.value)}
                        placeholder={canModify ? "Click to write scene description…" : "No scene description."}
                        rows={2}
                        className="w-full bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs outline-none focus:border-violet-500/50 transition resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-zinc-850">
                      <span className="text-[9px] text-zinc-500 uppercase font-semibold">
                        {(item.comments_count ?? item.comments?.[0]?.count ?? 0)} Comment{(item.comments_count ?? item.comments?.[0]?.count ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <a 
                        href={bm.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[9px] text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-0.5"
                      >
                        Source <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* ── DRAGGABLE STICKY TEXT NOTES (STICKIES) ────────────────────── */}
            {canvas.notes?.map((note: any) => {
              const isConnectingActive = arrowMode.step !== 'idle'
              const isSelectedSource = arrowMode.fromId === note.id
              const selectedColor = STICKY_COLORS.find(sc => sc.hex === note.color) || STICKY_COLORS[3]

              return (
                <div
                  key={note.id}
                  onMouseDown={(e) => startDrag(note.id, 'note', e)}
                  style={{ 
                    left: note.x, 
                    top: note.y, 
                    width: note.size === 's' ? 160 : note.size === 'l' ? 320 : 220, 
                    height: note.size === 's' ? 110 : note.size === 'l' ? 220 : 160 
                  }}
                  className={`absolute rounded-xl border p-3 flex flex-col shadow-lg z-10 transition-shadow duration-150 cursor-grab active:cursor-grabbing ${selectedColor.bg} ${
                    dragging?.id === note.id && dragging?.type === 'note' ? 'shadow-2xl ring-2 ring-violet-500/50' : ''
                  } ${
                    isConnectingActive 
                      ? isSelectedSource 
                        ? 'ring-3 ring-amber-500' 
                        : 'hover:ring-3 hover:ring-violet-500 cursor-pointer'
                      : ''
                  }`}
                  onClick={() => {
                    if (isConnectingActive) {
                      handleNodeClick(note.id, 'note')
                    }
                  }}
                >
                  {/* Note Header / Color bar */}
                  <div
                    className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 select-none flex-shrink-0"
                  >
                    {/* Sticky Note Colors & Size pickers */}
                    <div className="flex gap-1 items-center min-w-0">
                      {STICKY_COLORS.map(sc => (
                        <button
                          key={sc.hex}
                          type="button"
                          onClick={() => updateStickyNoteColor(note.id, sc.hex)}
                          className={`w-2 h-2 rounded-full transition-transform hover:scale-125 flex-shrink-0 cursor-pointer ${
                            note.color === sc.hex ? 'ring-1 ring-white scale-110' : ''
                          }`}
                          style={{ background: sc.hex }}
                        />
                      ))}
                      
                      <div className="flex gap-0.5 items-center ml-1.5 border-l border-white/10 pl-1.5 flex-shrink-0">
                        {['S', 'M', 'L'].map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateStickyNoteSize(note.id, sz.toLowerCase() as 's' | 'm' | 'l')
                            }}
                            className={`w-3.5 h-3.5 text-[8px] font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
                              (note.size || 'm') === sz.toLowerCase()
                                ? 'bg-white/20 text-white font-extrabold border border-white/25'
                                : 'text-white/30 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateStickyNote(note)
                        }}
                        className="p-0.5 hover:bg-white/10 rounded transition-all text-white/40 hover:text-white cursor-pointer"
                        title="Duplicate Note"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {canModify && (
                        <button
                          type="button"
                          onClick={(e) => deleteStickyNote(note.id, e)}
                          className="p-0.5 hover:bg-white/10 rounded transition-all text-white/40 hover:text-red-400 cursor-pointer flex-shrink-0"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sticky Notes text area */}
                  <textarea
                    value={note.text}
                    disabled={!canModify}
                    onChange={(e) => updateStickyNoteText(note.id, e.target.value)}
                    placeholder={canModify ? "Write note details…" : ""}
                    className="flex-1 bg-transparent resize-none outline-none text-xs text-white placeholder-white/30 leading-relaxed border-none focus:ring-0 p-0 min-h-0"
                  />
                </div>
              )
            })}

            </div>
          </div>
        </div>

      </div>

      {/* ── CANVAS RIGHT PANEL: EMBED PLAYER & DISCUSSION STREAM ──────────────── */}
      {activeDetailItem && (
        <div className="w-[320px] bg-zinc-950 border-l border-zinc-850 flex flex-col flex-shrink-0 animate-fade-in z-20 shadow-2xl relative">
          
          {/* Header Panel */}
          <div className="px-4 py-3.5 border-b border-zinc-850 bg-zinc-950/40 flex items-center justify-between flex-shrink-0">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Active Workspace Card</span>
              <h3 className="text-white font-semibold text-xs truncate leading-snug mt-0.5">
                {activeDetailItem.bookmark?.title || 'Clip details'}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedItemId(null)}
              className="p-1 hover:bg-zinc-850 text-zinc-500 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Embedded Player details */}
          <div className="p-3 border-b border-zinc-850 bg-zinc-900/10 flex-shrink-0">
            <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-zinc-800 shadow">
              <iframe
                src={getEmbedUrl(activeDetailItem.bookmark)}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500 font-mono">
              <span>Saved Timestamp: {formatTime(activeDetailItem.bookmark?.timestamp)}</span>
              <a 
                href={activeDetailItem.bookmark?.url}
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:text-violet-300 font-semibold"
              >
                Link
              </a>
            </div>
          </div>

          {/* Comments Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Comments Feed ({comments.length})</span>
            
            {loadingComments ? (
              <div className="flex flex-col gap-2">
                <div className="h-14 bg-zinc-900 border border-zinc-850 rounded-xl animate-pulse" />
                <div className="h-14 bg-zinc-900 border border-zinc-850 rounded-xl animate-pulse" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-850 rounded-xl">
                <p className="text-zinc-650 text-xs">No discussion yet. Type comments below!</p>
              </div>
            ) : (
              comments.map(c => {
                const initials = c.profiles?.full_name?.[0] || c.profiles?.email?.[0] || 'U'
                return (
                  <div key={c.id} className="flex gap-2.5 items-start bg-zinc-900/50 border border-zinc-850 rounded-xl p-2.5">
                    <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-bold flex items-center justify-center uppercase flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-white truncate">
                          {c.profiles?.full_name || c.profiles?.email?.split('@')[0]}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[8px] text-zinc-600">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                          {(c.user_id === userId || boardData.user_id === userId) && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="text-zinc-600 hover:text-red-400 p-0.5 rounded hover:bg-zinc-800 transition cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Comment input form */}
          <form onSubmit={postComment} className="p-3 border-t border-zinc-850 bg-zinc-950 flex gap-2 flex-shrink-0">
            <input
              type="text"
              required
              placeholder="Post a comment…"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={postingComment || !newComment.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95 flex-shrink-0 cursor-pointer"
            >
              {postingComment ? '…' : 'Post'}
            </button>
          </form>
        </div>
      )}

      {/* ── CLIP PICKER MODAL (ADD TO BOARD) ──────────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPicker(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/20">
              <span className="text-white font-bold text-sm">Add Bookmark clip to Canvas</span>
              <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-850 bg-zinc-900/10">
              <input
                autoFocus
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search your bookmarks…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-violet-500 transition-all"
              />
            </div>

            <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2">
              {filteredBookmarks.length === 0 ? (
                <p className="text-zinc-655 text-xs text-center py-10">No bookmarks available to add</p>
              ) : filteredBookmarks.map(bm => {
                const Icon = bm.site === 'youtube' ? MonitorPlay : Film
                return (
                  <button
                    key={bm.id}
                    onClick={() => handleAddBookmark(bm.id)}
                    className="flex items-center gap-3 p-2.5 bg-zinc-900 hover:bg-zinc-800/80 rounded-xl transition text-left border border-zinc-850 hover:border-zinc-800 cursor-pointer"
                  >
                    {bm.screenshot_url ? (
                      <img src={bm.screenshot_url} alt="" className="w-14 h-9 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-9 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3 h-3 text-zinc-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{bm.title || bm.video_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-zinc-500 text-[10px]">{formatTime(bm.timestamp)}</span>
                        {bm.tags?.slice(0, 1).map((t: string) => (
                          <span key={t} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">#{t}</span>
                        ))}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE INVITE COLLABORATORS MODAL ──────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowInviteModal(false); setInviteError(''); setInviteSuccess(''); }}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/30">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" /> Collaborators & Members
              </span>
              <button onClick={() => { setShowInviteModal(false); setInviteError(''); setInviteSuccess(''); }} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Form to invite */}
              {canModify && (
                <form onSubmit={inviteMember} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter email to invite…"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-violet-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/20 active:scale-95 disabled:opacity-50 px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </button>
                </form>
              )}

              {inviteError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">{inviteSuccess}</p>}

              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Board Members</label>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {/* Owner */}
                  {owner && (
                    <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded-xl border border-zinc-850">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white uppercase flex-shrink-0">
                          {owner.full_name?.[0] || owner.email?.[0] || 'O'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{owner.full_name || owner.email?.split('@')[0]}</p>
                          <p className="text-zinc-500 text-[9px] truncate leading-none mt-0.5">{owner.email}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase">Owner</span>
                    </div>
                  )}

                  {/* Members */}
                  {members.map(m => (
                    <div key={m.profiles.id} className="flex items-center justify-between p-2 bg-zinc-900/30 rounded-xl border border-zinc-850">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 uppercase flex-shrink-0">
                          {m.profiles.full_name?.[0] || m.profiles.email?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{m.profiles.full_name || m.profiles.email?.split('@')[0]}</p>
                          <p className="text-zinc-500 text-[9px] truncate leading-none mt-0.5">{m.profiles.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-750 px-2 py-0.5 rounded-full uppercase">{m.role}</span>
                        {isBoardOwner && (
                          <button
                            onClick={() => removeMember(m.profiles.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-all cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
