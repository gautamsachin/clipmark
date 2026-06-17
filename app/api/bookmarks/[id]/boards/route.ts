import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── GET /api/bookmarks/[id]/boards ───────────────────────────────────────────
// Fetch all board IDs that this bookmark is pinned to by the user
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('board_items')
      .select('board_id')
      .eq('bookmark_id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ boardIds: data?.map(d => d.board_id) || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PUT /api/bookmarks/[id]/boards ───────────────────────────────────────────
// Synchronize board items for this bookmark (pins/unpins)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { boardIds } = body
    if (!Array.isArray(boardIds)) {
      return NextResponse.json({ error: 'boardIds must be an array' }, { status: 400 })
    }

    // Fetch existing board_items for this bookmark created by the user
    const { data: existing, error: getError } = await supabase
      .from('board_items')
      .select('board_id')
      .eq('bookmark_id', id)
      .eq('user_id', user.id)

    if (getError) throw getError
    const existingIds = existing?.map(d => d.board_id) || []

    const toDelete = existingIds.filter(bid => !boardIds.includes(bid))
    const toInsert = boardIds.filter(bid => !existingIds.includes(bid))

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('board_items')
        .delete()
        .eq('bookmark_id', id)
        .eq('user_id', user.id)
        .in('board_id', toDelete)
      if (delError) throw delError
    }

    if (toInsert.length > 0) {
      const { error: insError } = await supabase
        .from('board_items')
        .insert(
          toInsert.map(boardId => ({
            board_id: boardId,
            bookmark_id: id,
            user_id: user.id
          }))
        )
      if (insError) throw insError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
