import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'

const ACCESS_DAYS = 90 // 3 months

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''

    // Verify signature
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expected !== signature) {
      console.error('Webhook signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const admin = createAdminClient()
    console.log('Razorpay webhook:', event.event)

    // ── payment.captured — one-time payment succeeded ─────────────────────
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const userId  = payment.notes?.user_id

      if (!userId) {
        console.error('No user_id in payment notes')
        return NextResponse.json({ received: true })
      }

      // Calculate expiry: now + 90 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + ACCESS_DAYS)

      await admin.from('profiles').update({
        plan: 'pro',
        subscription_status: 'active',
        razorpay_customer_id: payment.contact || null,
        plan_expires_at: expiresAt.toISOString(),
      }).eq('id', userId)

      console.log(`Pro access granted to ${userId} until ${expiresAt.toISOString()}`)
    }

    // ── payment.failed ────────────────────────────────────────────────────
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity
      console.log('Payment failed for user:', payment.notes?.user_id)
      // No DB change needed — user stays on free plan
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
