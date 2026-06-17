import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient, getAuthFromRequest } from '@/lib/supabase-server'

// Helper: get a supabase client suitable for the auth method
async function getClientForAuth(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return { client: null, userId: null }

  if (auth.method === 'cookie') {
    const supabase = await createServerSupabaseClient()
    return { client: supabase, userId: auth.userId }
  }

  const admin = createAdminClient()
  return { client: admin, userId: auth.userId }
}

// ── PUT /api/bookmarks/[id] — update notes/tags/timestamp ────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { client, userId } = await getClientForAuth(req)
    if (!client || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { notes, tags, timestamp, title, collection_id } = body

    const { data, error } = await client
      .from('bookmarks')
      .update({ notes, tags, timestamp, title, collection_id: collection_id || null, saved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId) // ensure user owns this bookmark
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ bookmark: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE /api/bookmarks/[id] ────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { client, userId } = await getClientForAuth(req)
    if (!client || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await client
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
