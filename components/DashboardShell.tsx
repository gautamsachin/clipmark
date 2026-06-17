'use client'

import { useState, useEffect } from 'react'
import { Menu, ChevronLeft } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import SyncTokenExposer from '@/components/SyncTokenExposer'

interface Props {
  profile: any // eslint-disable-line @typescript-eslint/no-explicit-any
  children: React.ReactNode
}

export default function DashboardShell({ profile, children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load persistence from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_open')
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarOpen(saved === 'true')
    }
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen
    setIsSidebarOpen(nextState)
    localStorage.setItem('sidebar_open', String(nextState))
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex overflow-hidden relative">
      {/* Sidebar container */}
      <div
        className={`fixed inset-y-0 left-0 z-20 w-56 transform transition-transform duration-300 ease-in-out ${
          mounted && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <Sidebar profile={profile} className="!relative" />
        
        {/* Collapse toggle button next to the logo inside Sidebar */}
        <button
          onClick={toggleSidebar}
          className="absolute top-5 right-3 text-zinc-500 hover:text-white hover:bg-zinc-800/60 p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 z-30"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Floating button to expand sidebar when hidden */}
      {mounted && !isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-[18px] left-4 z-30 p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center hover:border-zinc-700"
          title="Expand sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 pt-6 pr-6 pb-6 h-screen overflow-y-auto custom-scrollbar flex flex-col min-h-0 transition-all duration-300 ease-in-out ${
          mounted && !isSidebarOpen ? 'ml-0 pl-16' : 'ml-56 pl-6'
        }`}
      >
        {/* If sidebar is closed, push content down slightly to make space for floating menu button on mobile/desktop */}
        {mounted && !isSidebarOpen && <div className="h-1.5 w-full flex-shrink-0" />}
        {children}
      </main>

      <SyncTokenExposer />
    </div>
  )
}
