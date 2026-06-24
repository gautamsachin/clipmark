import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Query profiles matching email or full_name case-insensitively
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(10)

    if (error) throw error

    return NextResponse.json({ users: profiles || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
