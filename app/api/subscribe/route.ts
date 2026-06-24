import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// ── POST /api/subscribe ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read plan config from env — change price/duration here without touching code
    const planAmount = Number(process.env.PLAN_AMOUNT_PAISE) || 99900
    const planDays = Number(process.env.PLAN_ACCESS_DAYS) || 90
    const planName = process.env.PLAN_NAME || 'Pro - 3 Months'

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Check if already has active access
    if (profile?.plan === 'pro' && profile?.plan_expires_at) {
      const expiry = new Date(profile.plan_expires_at)
      if (expiry > new Date()) {
        return NextResponse.json({
          error: `You already have Pro access until ${expiry.toLocaleDateString()}`
        }, { status: 400 })
      }
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: planAmount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        user_id: user.id,
        email: user.email || '',
        plan_name: planName,
        access_days: planDays,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: planAmount,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      userEmail: user.email,
      userName: profile?.full_name || '',
      plan: { name: planName, access_days: planDays },
    })
  } catch (err: any) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET /api/subscribe — returns plan details for the settings UI ─────────────
export async function GET() {
  return NextResponse.json({
    plan: {
      name: process.env.PLAN_NAME || 'Pro - 3 Months',
      amount_paise: Number(process.env.PLAN_AMOUNT_PAISE) || 99900,
      access_days: Number(process.env.PLAN_ACCESS_DAYS) || 90,
    }
  })
}