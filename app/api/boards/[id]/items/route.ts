import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/boards/[id]/items — add bookmark to board
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: board_id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookmark_id, card_note } = await req.json()
    if (!bookmark_id) return NextResponse.json({ error: 'bookmark_id required' }, { status: 400 })

    // Verify board access (owner or editor collaborator)
    const { data: board } = await supabase.from('boards').select('user_id').eq('id', board_id).single()
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

    const isOwner = board.user_id === user.id
    let isEditor = false

    if (!isOwner) {
      const { data: member } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', board_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (member && member.role === 'editor') {
        isEditor = true
      }
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current max position
    const { data: existing } = await supabase
      .from('board_items')
      .select('position')
      .eq('board_id', board_id)
      .order('position', { ascending: false })
      .limit(1)

    const position = (existing?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('board_items')
      .insert({ board_id, bookmark_id, user_id: user.id, position, card_note: card_note || null })
      .select('*, bookmark:bookmarks(*)')
      .single()

    if (error) throw error
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/boards/[id]/items — reorder items (pass full ordered array of ids)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: board_id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderedIds } = await req.json() // array of board_item ids in new order

    // Verify board access (owner or editor collaborator)
    const { data: board } = await supabase.from('boards').select('user_id').eq('id', board_id).single()
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

    const isOwner = board.user_id === user.id
    let isEditor = false

    if (!isOwner) {
      const { data: member } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', board_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (member && member.role === 'editor') {
        isEditor = true
      }
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await Promise.all(
      orderedIds.map((itemId: string, index: number) =>
        supabase.from('board_items')
          .update({ position: index })
          .eq('id', itemId)
          .eq('board_id', board_id)
      )
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
