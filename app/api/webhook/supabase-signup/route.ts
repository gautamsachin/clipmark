import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    // Security check (Header authorization verify)
    const authHeader = req.headers.get('authorization')
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
    }

    const payload = await req.json()
    console.log('Supabase signup webhook payload:', payload)

    // Supabase database webhooks payload schema matches:
    // { type: 'INSERT', table: 'profiles', record: { email, full_name, ... } }
    const { record, type } = payload

    if (type !== 'INSERT' || !record) {
      return NextResponse.json({ message: 'Ignore non-insert operations' })
    }

    const { email, full_name } = record

    if (!email) {
      console.error('No email in profiles webhook payload')
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    console.log(`Sending welcome email to ${email}`)
    await sendWelcomeEmail(email, full_name || '')

    return NextResponse.json({ ok: true, message: 'Welcome email queued successfully' })
  } catch (err: any) {
    console.error('Supabase signup webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
