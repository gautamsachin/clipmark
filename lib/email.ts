import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'Clipmark <onboarding@resend.dev>'

/**
 * Send welcome email to newly registered users
 */
export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend key not set, skipping welcome email.')
    return
  }

  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ededed; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f1f24;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">Clipmark</span>
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Welcome to Clipmark, ${name || 'there'}! 👋</h1>
      <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        We're thrilled to have you here. Clipmark is your visual canvas dashboard built to bookmark, organize, and annotate YouTube and Instagram video clips at any timestamp.
      </p>
      <div style="background-color: #121214; border: 1px solid #27272a; padding: 18px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Next steps:</h3>
        <ul style="color: #a1a1aa; font-size: 13px; line-height: 1.6; padding-left: 20px; margin: 0;">
          <li>Install the Chrome extension to bookmark videos on the fly.</li>
          <li>Organize your clips into <strong>Collections</strong>.</li>
          <li>Create an infinite <strong>Board</strong> to map out visual storyboards.</li>
        </ul>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="display: block; text-align: center; background-color: #7c3aed; color: #ffffff; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: bold; text-decoration: none;">
        Go to Dashboard
      </a>
      <hr style="border: 0; border-top: 1px solid #27272a; margin: 32px 0 20px 0;" />
      <p style="font-size: 11px; color: #52525b; text-align: center; margin: 0;">
        You received this because you signed up for Clipmark.
      </p>
    </div>
  `

  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welcome to Clipmark! 🎬',
    html,
  })

  if (response.error) {
    console.error('Resend Welcome Email Error:', response.error)
  } else {
    console.log('Resend Welcome Email Success:', response.data)
  }

  return response
}

/**
 * Send receipt email for successful payment
 */
export async function sendPaymentSuccessEmail(
  email: string,
  name: string,
  planName: string,
  amount: number,
  expiresAt: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend key not set, skipping payment success email.')
    return
  }

  const formattedAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })

  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ededed; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f1f24;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">Clipmark</span>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); display: inline-block; padding: 8px 16px; border-radius: 9999px;">
          <span style="color: #34d399; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Upgrade Success</span>
        </div>
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 8px;">Your Pro Access is Active! 🚀</h1>
      <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        Thank you for upgrading, ${name || 'subscriber'}. You now have full unlocked access to Clipmark Pro.
      </p>
      
      <div style="background-color: #121214; border: 1px solid #27272a; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Plan Name</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${planName}</td>
          </tr>
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Amount Paid</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Access Expiry</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${new Date(expiresAt).toLocaleDateString()}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #121214; border: 1px solid #27272a; padding: 18px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Your Unlocked Pro Features:</h3>
        <ul style="color: #a1a1aa; font-size: 13px; line-height: 1.6; padding-left: 20px; margin: 0;">
          <li>Unlimited bookmarks (no more 10-bookmark limit!)</li>
          <li>Cloud sync active across all devices</li>
          <li>Full screenshot storage and custom board comments</li>
        </ul>
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="display: block; text-align: center; background-color: #7c3aed; color: #ffffff; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: bold; text-decoration: none;">
        Manage Subscription
      </a>
    </div>
  `

  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welcome to Clipmark Pro! 💎',
    html,
  })

  if (response.error) {
    console.error('Resend Payment Success Email Error:', response.error)
  } else {
    console.log('Resend Payment Success Email Success:', response.data)
  }

  return response
}

/**
 * Send notification email for failed payment
 */
export async function sendPaymentFailureEmail(
  email: string,
  name: string,
  planName: string,
  amount: number,
  errorReason?: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend key not set, skipping payment failure email.')
    return
  }

  const formattedAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })

  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ededed; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f1f24;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">Clipmark</span>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="background-color: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2); display: inline-block; padding: 8px 16px; border-radius: 9999px;">
          <span style="color: #f87171; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Payment Failed</span>
        </div>
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 8px;">Payment Transaction Failed ⚠️</h1>
      <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        Hello ${name || 'there'}. We wanted to let you know that your recent attempt to upgrade to Clipmark Pro was not successful.
      </p>

      <div style="background-color: #121214; border: 1px solid #27272a; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Plan Target</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${planName}</td>
          </tr>
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Attempted Amount</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${formattedAmount}</td>
          </tr>
          ${errorReason ? `
          <tr>
            <td style="color: #52525b; padding: 6px 0;">Reason for Failure</td>
            <td style="color: #f87171; text-align: right; font-weight: 600; padding: 6px 0;">${errorReason}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        No money has been charged from your account for this attempt. If the amount was debited, it will be refunded automatically by your bank within 5-7 business days.
      </p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings" style="display: block; text-align: center; background-color: #7c3aed; color: #ffffff; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: bold; text-decoration: none;">
        Retry Payment
      </a>
    </div>
  `

  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Payment Failed: Clipmark Pro Upgrade ⚠️',
    html,
  })

  if (response.error) {
    console.error('Resend Payment Failure Email Error:', response.error)
  } else {
    console.log('Resend Payment Failure Email Success:', response.data)
  }

  return response
}
