import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/sync-token/verify — extension calls this to verify a sync token
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Check if service role key is actually set (not the placeholder)
    const hasServiceRole = serviceRoleKey &&
      serviceRoleKey !== 'paste_service_role_here' &&
      serviceRoleKey.length > 20

    if (hasServiceRole) {
      // Use admin client — bypasses RLS
      const admin = createClient(supabaseUrl, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data, error } = await admin
        .from('sync_tokens')
        .select('user_id')
        .eq('token', token)
        .single()

      if (error || !data) {
        return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 })
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('email, plan')
        .eq('id', data.user_id)
        .single()

      return NextResponse.json({ valid: true, userId: data.user_id, profile })
    } else {
      // No service role — use the SECURITY DEFINER RPC function
      // This requires running migration_sync_token_rpc.sql in Supabase
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data, error } = await anon.rpc('verify_sync_token', { p_token: token })

      if (error || !data?.length) {
        console.error('Token verification failed:', error)
        return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 })
      }

      const row = data[0]
      return NextResponse.json({
        valid: true,
        userId: row.user_id,
        profile: { email: row.email, plan: row.plan }
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
