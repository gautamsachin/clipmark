'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Bookmark, Mail, Globe } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/callback` },
    })
  }

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
            <Bookmark className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clipmark</h1>
          <p className="text-sm text-zinc-500 mt-1">Your video bookmark dashboard</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-white font-medium">Check your email</p>
              <p className="text-zinc-400 text-sm mt-1">We sent a magic link to <span className="text-white">{email}</span></p>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-2.5 rounded-xl hover:bg-zinc-100 transition mb-4"
              >
                <Globe className="w-5 h-5" />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Email magic link */}
              <form onSubmit={loginWithEmail} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm outline-none focus:border-violet-500 transition"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  )
}
