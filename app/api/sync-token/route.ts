import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { nanoid } from 'nanoid'

// GET /api/sync-token — get or create sync token for extension
// Uses cookie-based auth (user must be signed in to dashboard)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure profile row exists
    // (may be missing for users who signed up before the trigger was created)
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, email, plan')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Auto-create profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          plan: 'free',
        })
        .select('id, email, plan')
        .single()

      if (profileError || !newProfile) {
        console.error('Failed to create profile:', profileError)
        return NextResponse.json(
          { error: 'Could not initialize user profile: ' + profileError?.message },
          { status: 500 }
        )
      }
      profile = newProfile
    }

    // Try to fetch existing sync token
    const { data: existing } = await supabase
      .from('sync_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        token: existing.token,
        profile: { email: profile.email, plan: profile.plan }
      })
    }

    // Create new token
    const token = nanoid(32)
    const { error: insertError } = await supabase
      .from('sync_tokens')
      .insert({ user_id: user.id, token })

    if (insertError) {
      console.error('Failed to insert sync token:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      token,
      profile: { email: profile.email, plan: profile.plan }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
