import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── GET /api/boards/[id]/items/[itemId]/comments ─────────────────────────────
// Get all comments for a board item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('board_item_comments')
      .select('id, text, created_at, user_id, profiles(id, email, full_name, avatar_url)')
      .eq('board_item_id', itemId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ comments: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST /api/boards/[id]/items/[itemId]/comments ────────────────────────────
// Add a comment to a board item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { text } = body
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('board_item_comments')
      .insert({
        board_item_id: itemId,
        user_id: user.id,
        text: text.trim()
      })
      .select('id, text, created_at, user_id, profiles(id, email, full_name, avatar_url)')
      .single()

    if (error) throw error
    return NextResponse.json({ comment: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
