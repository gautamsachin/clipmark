import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── DELETE /api/boards/[id]/members/[memberId] ───────────────────────────────
// Remove a member from the board (can be triggered by owner or collaborator themselves)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: boardId, memberId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check board owner
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single()

    const isOwner = board?.user_id === user.id
    const isSelf = memberId === user.id

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', memberId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
