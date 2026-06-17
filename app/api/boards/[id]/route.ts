import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: board, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Allow access if owner OR board is public OR collaborator
    if (board.user_id !== user?.id && !board.is_public) {
      const { data: member } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', id)
        .eq('user_id', user?.id || '')
        .maybeSingle()

      if (!member) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fetch items with bookmark data
    const { data: items } = await supabase
      .from('board_items')
      .select('*, bookmark:bookmarks(*)')
      .eq('board_id', id)
      .order('position', { ascending: true })

    return NextResponse.json({ board, items: items || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_public !== undefined) updateData.is_public = body.is_public
    if (body.cover_url !== undefined) updateData.cover_url = body.cover_url
    if (body.canvas_data !== undefined) updateData.canvas_data = body.canvas_data

    const { data, error } = await supabase
      .from('boards')
      .update(updateData)
      .eq('id', id)
      .select().single()

    if (error) throw error
    return NextResponse.json({ board: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.from('boards').delete().eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
