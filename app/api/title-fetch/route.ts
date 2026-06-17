import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/title-fetch?video_id=xxx&site=youtube
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const video_id = searchParams.get('video_id')
    const site     = searchParams.get('site')
    if (!video_id || !site) return NextResponse.json({ error: 'video_id and site required' }, { status: 400 })

    let title: string | null = null

    if (site === 'youtube') {
      // YouTube oEmbed — free, no API key needed
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video_id}&format=json`
      )
      if (res.ok) {
        const data = await res.json()
        title = data.title || null
      }
    } else if (site === 'instagram') {
      // Instagram oEmbed — works for public reels
      const res = await fetch(
        `https://api.instagram.com/oembed/?url=https://www.instagram.com/reel/${video_id}/`
      )
      if (res.ok) {
        const data = await res.json()
        title = data.title || null
      }
    }

    if (title) {
      // Save title back to bookmark
      await supabase
        .from('bookmarks')
        .update({ title })
        .eq('video_id', video_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ title })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
