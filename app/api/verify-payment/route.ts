import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      access_days,
    } = await req.json()

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // access_days from frontend → fallback to env → fallback to 90
    const days = Number(access_days)
      || Number(process.env.PLAN_ACCESS_DAYS)
      || 90

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('plan_expires_at')
      .eq('id', user.id)
      .single()

    // Extend from current expiry if still active, otherwise from today
    const baseDate = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
      ? new Date(profile.plan_expires_at)
      : new Date()

    const expiresAt = new Date(baseDate)
    expiresAt.setDate(expiresAt.getDate() + days)

    await admin.from('profiles').update({
      plan: 'pro',
      subscription_status: 'active',
      plan_expires_at: expiresAt.toISOString(),
      razorpay_customer_id: razorpay_payment_id,
    }).eq('id', user.id)

    return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() })
  } catch (err: any) {
    console.error('Verify payment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}