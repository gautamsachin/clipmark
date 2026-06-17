import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Admin client — only used in API routes, never in browser
import { createClient } from '@supabase/supabase-js'
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

import { NextRequest } from 'next/server'

export type AuthResult = {
  userId: string
  method: 'cookie' | 'token'
} | null

export const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
  const result = await getAuthFromRequest(req)
  return result?.userId || null
}

export const getAuthFromRequest = async (req: NextRequest): Promise<AuthResult> => {
  // 1. Try standard Supabase auth (session cookie)
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return { userId: user.id, method: 'cookie' }
  } catch {}

  // 2. Try Bearer token (sync token)
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token) {
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const hasServiceRole = serviceRoleKey &&
          serviceRoleKey !== 'paste_service_role_here' &&
          serviceRoleKey.length > 20

        if (hasServiceRole) {
          const admin = createAdminClient()
          const { data, error } = await admin
            .from('sync_tokens')
            .select('user_id')
            .eq('token', token)
            .single()
          if (!error && data) {
            return { userId: data.user_id, method: 'token' }
          }
        } else {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          const { createClient } = await import('@supabase/supabase-js')
          const anon = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false }
          })
          const { data, error } = await anon.rpc('verify_sync_token', { p_token: token })
          if (!error && data && data.length > 0) {
            return { userId: data[0].user_id, method: 'token' }
          }
        }
      } catch {}
    }
  }

  return null
}

