import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from '@/lib/email'

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

      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      await admin.from('profiles').update({
        plan: 'pro',
        subscription_status: 'active',
        razorpay_customer_id: payment.contact || null,
        plan_expires_at: expiresAt.toISOString(),
      }).eq('id', userId)

      console.log(`Pro access granted to ${userId} until ${expiresAt.toISOString()}`)

      if (profile?.email) {
        const planName = payment.notes?.plan_name || 'Pro - 3 Months'
        const amount = payment.amount || 99900
        try {
          await sendPaymentSuccessEmail(
            profile.email,
            profile.full_name || '',
            planName,
            amount,
            expiresAt.toISOString()
          )
        } catch (mailErr) {
          console.error('Failed to send payment success email:', mailErr)
        }
      }
    }

    // ── payment.failed ────────────────────────────────────────────────────
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity
      const userId  = payment.notes?.user_id
      console.log('Payment failed for user:', userId)
      
      if (userId) {
        const { data: profile } = await admin
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile?.email) {
          const planName = payment.notes?.plan_name || 'Pro - 3 Months'
          const amount = payment.amount || 99900
          const errorReason = payment.error_description || 'Payment declined or cancelled.'
          try {
            await sendPaymentFailureEmail(
              profile.email,
              profile.full_name || '',
              planName,
              amount,
              errorReason
            )
          } catch (mailErr) {
            console.error('Failed to send payment failure email:', mailErr)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
