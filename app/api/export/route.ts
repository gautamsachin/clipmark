import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/export?format=json|csv
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const format = new URL(req.url).searchParams.get('format') || 'json'

    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) throw error

    if (format === 'csv') {
      const headers = ['video_id', 'site', 'url', 'title', 'timestamp', 'notes', 'tags', 'saved_at']
      const rows = (bookmarks || []).map(b => [
        b.video_id,
        b.site,
        b.url,
        b.title || '',
        b.timestamp,
        (b.notes || '').replace(/,/g, ';'),
        (b.tags || []).join('|'),
        b.saved_at,
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="clipmark-export-${Date.now()}.csv"`,
        },
      })
    }

    // JSON export
    return new NextResponse(JSON.stringify(bookmarks, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="clipmark-export-${Date.now()}.json"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/export — bulk delete all bookmarks
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ids } = await req.json() // array of bookmark ids, or empty for all

    let query = supabase.from('bookmarks').delete().eq('user_id', user.id)
    if (ids?.length) query = query.in('id', ids)

    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
