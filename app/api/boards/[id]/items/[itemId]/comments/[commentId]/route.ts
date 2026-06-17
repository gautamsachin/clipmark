import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── DELETE /api/boards/[id]/items/[itemId]/comments/[commentId] ──────────────
// Delete a comment (must be the comment author or board owner)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; commentId: string }> }
) {
  try {
    const { commentId, id: boardId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch comment details
    const { data: comment } = await supabase
      .from('board_item_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    // Fetch board owner details
    const { data: board } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', boardId)
      .single()

    const isAuthor = comment.user_id === user.id
    const isBoardOwner = board?.user_id === user.id

    if (!isAuthor && !isBoardOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('board_item_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
