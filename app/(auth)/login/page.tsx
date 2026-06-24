'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Bookmark, Globe } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()

  useEffect(() => {
    localStorage.removeItem('clipmark_sync_token')
    localStorage.removeItem('clipmark_user_profile')
  }, [])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/callback` },
    })
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
          {/* Google */}
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-2.5 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
          >
            <Globe className="w-5 h-5" />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  )
}
