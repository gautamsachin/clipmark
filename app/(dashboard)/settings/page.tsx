'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CreditCard, LogOut, User, CheckCircle, Clock, Download, Key } from 'lucide-react'

declare global { interface Window { Razorpay: any } }

const loadRazorpay = () => new Promise<void>((res) => {
  if (window.Razorpay) { res(); return }
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.onload = () => res()
  document.body.appendChild(s)
})

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [syncToken, setSyncToken] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      
      try {
        const res = await fetch('/api/sync-token')
        if (res.ok) {
          const dataToken = await res.json()
          setSyncToken(dataToken.token || '')
        }
      } catch (err) {
        console.error('Failed to load sync token:', err)
      }
      
      setLoading(false)
    }
    load()
  }, [])


  const handlePayment = async () => {
    setPayLoading(true)
    try {
      await loadRazorpay()

      // Create order on server
      const res = await fetch('/api/subscribe', { method: 'POST' })
      const data = await res.json()
      if (data.error) { alert(data.error); return }

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'Clipmark',
        description: 'Pro Access — 3 Months',
        image: '/favicon.ico',
        prefill: {
          email: data.userEmail,
          name: data.userName,
        },
        theme: { color: '#7c3aed' },
        handler: async (response: any) => {
          // Payment done — verify on server then refresh profile
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.ok) {
            // Refresh profile
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: updated } = await supabase.from('profiles').select('*').eq('id', user.id).single()
              setProfile(updated)
            }
          } else {
            alert('Payment verification failed. Please contact support.')
          }
        },
        modal: {
          ondismiss: () => setPayLoading(false)
        }
      })
      rzp.open()
    } catch (err: any) {
      alert(err.message)
    }
    setPayLoading(false)
  }

  const handleExport = async (format: 'json' | 'csv') => {
    setExportLoading(true)
    const res = await fetch(`/api/export?format=${format}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clipmark-export.${format}`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
  }

  const handleLogout = async () => {
    localStorage.removeItem('clipmark_sync_token')
    await supabase.auth.signOut()
    router.push('/login')
  }


  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>

  const isPro = profile?.plan === 'pro' && profile?.subscription_status === 'active'
  const expiryDate = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const isExpired = expiryDate ? expiryDate < new Date() : false
  const daysLeft = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Account */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white font-semibold">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} className="w-10 h-10 rounded-full" alt="avatar" />
          )}
          <div>
            <p className="text-white font-medium">{profile?.full_name || 'User'}</p>
            <p className="text-zinc-400 text-sm">{profile?.email}</p>
          </div>
        </div>
      </section>

      {/* Extension Sync */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white font-semibold">Chrome Extension Sync</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Connect your Chrome extension to save bookmarks, screenshots, notes, and tags directly to your cloud dashboard.
        </p>
        <div className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <input
            type="text"
            readOnly
            value={syncToken ? `${syncToken.substring(0, 8)}...${syncToken.substring(syncToken.length - 8)}` : 'Generating token...'}
            className="flex-1 bg-transparent border-none text-zinc-300 text-sm font-mono outline-none"
          />
          <button
            onClick={() => {
              if (syncToken) {
                navigator.clipboard.writeText(syncToken)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }
            }}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            {copied ? 'Copied!' : 'Copy Token'}
          </button>
        </div>
        <p className="text-zinc-500 text-xs mt-2">
          Note: If the Chrome extension is installed, it will connect automatically when you log into this dashboard.
        </p>
      </section>


      {/* Billing */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white font-semibold">Plan & Billing</h2>
        </div>

        {isPro && !isExpired ? (
          // ── Active pro ──────────────────────────────────────────────────
          <div>
            <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-4">
              <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium">Pro Access — Active</p>
                <p className="text-zinc-400 text-sm flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {daysLeft} days remaining · expires {expiryDate?.toLocaleDateString()}
                </p>
              </div>
            </div>
            {/* Allow re-purchase to extend */}
            <p className="text-zinc-500 text-xs mb-3">Want to extend your access by another 3 months?</p>
            <button
              onClick={handlePayment}
              disabled={payLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              {payLoading ? 'Opening payment…' : 'Extend — ₹999 for 3 more months'}
            </button>
          </div>
        ) : (
          // ── Free / expired ───────────────────────────────────────────────
          <div>
            {isExpired && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <Clock className="w-4 h-4 text-red-400" />
                <p className="text-red-300 text-sm">Your Pro access expired on {expiryDate?.toLocaleDateString()}</p>
              </div>
            )}

            {/* Free plan info */}
            <div className="p-4 bg-zinc-800 rounded-xl mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold text-sm">Free Plan</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Up to 10 bookmarks · local only</p>
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-1 rounded-lg">Current</span>
              </div>
            </div>

            {/* Pro plan */}
            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">Pro — 3 Months</p>
                  <p className="text-zinc-400 text-xs mt-0.5">One-time payment · no auto-renewal</p>
                </div>
                <div className="text-right">
                  <p className="text-violet-400 font-bold text-lg">₹999</p>
                  <p className="text-zinc-500 text-xs">≈ ₹333/month</p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-1">
                {[
                  'Unlimited bookmarks',
                  'Cloud sync across devices',
                  'Full-text + tag search',
                  'Screenshot storage',
                  'Boards & collections',
                  '3 months access — no subscription',
                ].map(f => (
                  <li key={f} className="text-sm text-zinc-300 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handlePayment}
              disabled={payLoading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {payLoading ? 'Opening payment…' : 'Get Pro Access — ₹999'}
            </button>
            <p className="text-center text-zinc-600 text-xs mt-2">One-time · no auto-renewal · no hidden charges</p>
          </div>
        )}
      </section>

      {/* Export */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white font-semibold">Export Bookmarks</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exportLoading}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-zinc-500 hover:text-red-400 text-sm transition"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  )
}
