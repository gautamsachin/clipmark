'use client'

import { useEffect } from 'react'

// Fetches the sync token from the API and writes it + profile info to localStorage
// so the Chrome extension (dashboard-sync.js content script) can pick it up.
export default function SyncTokenExposer() {
  useEffect(() => {
    const fetchAndExposeToken = async () => {
      try {
        const res = await fetch('/api/sync-token')
        if (res.ok) {
          const data = await res.json()
          if (data.token) {
            localStorage.setItem('clipmark_sync_token', data.token)
          }
          // Also store profile so extension doesn't need a separate verify call
          if (data.profile) {
            localStorage.setItem('clipmark_user_profile', JSON.stringify(data.profile))
          }
        } else {
          // On error (e.g. 401), clear the tokens
          localStorage.removeItem('clipmark_sync_token')
          localStorage.removeItem('clipmark_user_profile')
        }
      } catch (err) {
        console.error('Failed to fetch sync token:', err)
      }
    }

    fetchAndExposeToken()
  }, [])

  return null
}
