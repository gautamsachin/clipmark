import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient, getAuthFromRequest } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let client
    if (auth.method === 'cookie') {
      client = await createServerSupabaseClient()
    } else {
      client = createAdminClient()
    }
    
    // Fetch profile
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('plan, subscription_status, plan_expires_at')
      .eq('id', auth.userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Determine premium status
    // isPremium = is pro plan AND is active subscription status AND not expired
    const isPro = profile.plan === 'pro'
    const isActive = profile.subscription_status === 'active'
    const expiryDate = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null
    const isExpired = expiryDate ? expiryDate < new Date() : false
    const isPremium = isPro && isActive && !isExpired

    // Get bookmark count
    const { count } = await client
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.userId)

    return NextResponse.json({
      isPremium,
      bookmarkCount: count || 0,
      limit: isPremium ? 999999 : 10,
      plan: profile.plan
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
