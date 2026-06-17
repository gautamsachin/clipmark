import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient, getAuthFromRequest } from '@/lib/supabase-server'

// Helper: get a supabase client suitable for the auth method
async function getClientForAuth(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return { client: null, userId: null }

  if (auth.method === 'cookie') {
    // Dashboard user — use their session (RLS will handle filtering)
    const supabase = await createServerSupabaseClient()
    return { client: supabase, userId: auth.userId }
  }

  // Extension user — use admin client with explicit user_id filtering
  const admin = createAdminClient()
  return { client: admin, userId: auth.userId }
}

// ── GET /api/bookmarks?q=searchterm&tag=fitness ───────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { client, userId } = await getClientForAuth(req)
    if (!client || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q   = searchParams.get('q')?.trim() || ''
    const tag = searchParams.get('tag')?.trim() || ''
    const site = searchParams.get('site') || ''

    let query = client
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    if (site) query = query.eq('site', site)
    if (tag)  query = query.contains('tags', [tag])
    if (q) {
      query = query.or(
        `notes.ilike.%${q}%,tags.cs.{${q}}`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ bookmarks: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST /api/bookmarks ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { client, userId } = await getClientForAuth(req)
    if (!client || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { video_id, site, url, timestamp, notes, tags, screenshot_url, title } = body

    if (!video_id || !site || !url) {
      return NextResponse.json({ error: 'video_id, site and url are required' }, { status: 400 })
    }

    // Check free plan limit (10 bookmarks)
    const { data: profile } = await client
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    if (profile?.plan === 'free') {
      const { count } = await client
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      if ((count || 0) >= 10) {
        return NextResponse.json(
          { error: 'Free plan limit reached. Upgrade to Pro for unlimited bookmarks.' },
          { status: 403 }
        )
      }
    }

    // Upload screenshot to Supabase Storage if base64 provided
    let finalScreenshotUrl = screenshot_url || null
    if (screenshot_url?.startsWith('data:')) {
      try {
        const admin = createAdminClient()
        const base64 = screenshot_url.split(',')[1]
        const buffer = Buffer.from(base64, 'base64')
        const filename = `${userId}/${video_id}-${Date.now()}.jpg`
        const { error: uploadError } = await admin.storage
          .from('screenshots')
          .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) {
          const { data: publicUrl } = admin.storage.from('screenshots').getPublicUrl(filename)
          finalScreenshotUrl = publicUrl.publicUrl
        }
      } catch (uploadErr) {
        console.error('Screenshot upload failed:', uploadErr)
      }
    }

    // Upsert bookmark (update if same video_id for this user)
    const { data, error } = await client
      .from('bookmarks')
      .upsert({
        user_id: userId,
        video_id,
        site,
        url,
        title: title || null,
        timestamp: timestamp || 0,
        notes: notes || null,
        tags: tags || [],
        screenshot_url: finalScreenshotUrl,
        saved_at: new Date().toISOString(),
      }, { onConflict: 'user_id,video_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ bookmark: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
