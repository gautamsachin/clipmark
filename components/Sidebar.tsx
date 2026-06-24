'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Bookmark, Settings, MonitorPlay, Download,
  Sparkles, Layout, FolderOpen, LogOut, Lock
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

// Instagram icon (not available in this lucide-react version)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
)

export default function Sidebar({ profile, className = '' }: { profile: any; className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSite = searchParams?.get('site') || ''
  const supabase = createClient()
  const isPro = profile?.plan === 'pro' && profile?.subscription_status === 'active'

  const handleLogout = async () => {
    localStorage.removeItem('clipmark_sync_token')
    localStorage.removeItem('clipmark_user_profile')
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/bookmarks') return pathname === '/bookmarks' && !currentSite
    if (href.startsWith('/bookmarks?site=')) {
      const siteParam = href.split('site=')[1]
      return pathname === '/bookmarks' && currentSite === siteParam
    }
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive(href)
        ? 'bg-violet-600/20 text-violet-300'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
    }`

  return (
    <aside className={`fixed left-0 top-0 h-screen w-56 bg-zinc-950 border-r border-zinc-800/60 flex flex-col p-4 overflow-y-auto custom-scrollbar ${className}`}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-6 mt-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Bookmark className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Clipmark</span>
      </div>

      <nav className="flex-1 flex flex-col gap-5">

        {/* ── Library ──────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">Library</p>
          <div className="flex flex-col gap-0.5">
            <Link href="/bookmarks" className={navLinkClass('/bookmarks')}>
              <Bookmark className="w-4 h-4" />
              All Bookmarks
            </Link>
            <Link href="/bookmarks?site=youtube" className={navLinkClass('/bookmarks?site=youtube')}>
              <MonitorPlay className="w-4 h-4" />
              YouTube
            </Link>
            <Link href="/bookmarks?site=instagram" className={navLinkClass('/bookmarks?site=instagram')}>
              <InstagramIcon className="w-4 h-4" />
              Instagram
            </Link>
          </div>
        </div>

        {/* ── Organize ──────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">Organize</p>
          <div className="flex flex-col gap-0.5">
            <Link href="/boards" className={navLinkClass('/boards')}>
              <Layout className="w-4 h-4" />
              Boards
            </Link>
            <Link href="/collections" className={navLinkClass('/collections')}>
              <FolderOpen className="w-4 h-4" />
              Collections
            </Link>
          </div>
        </div>

        {/* ── Account ──────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">Account</p>
          <div className="flex flex-col gap-0.5">
            <Link href="/settings" className={navLinkClass('/settings')}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link href="/settings?tab=export" className={navLinkClass('/settings?tab=export')}>
              <Download className="w-4 h-4" />
              Export
            </Link>
          </div>
        </div>

      </nav>

      {/* Plan badge & Logout */}
      <div className="mt-auto flex-shrink-0 flex flex-col gap-2">
        {!isPro ? (
          <Link
            href="/settings"
            className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl hover:bg-violet-500/15 transition"
          >
            <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-violet-300">Upgrade to Pro</p>
              <p className="text-xs text-zinc-500">Unlimited bookmarks</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-xl">
            <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-violet-300">Pro Plan</p>
              <p className="text-xs text-zinc-500 truncate">{profile?.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
