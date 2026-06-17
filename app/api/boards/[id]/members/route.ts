import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Helper: Verify user has permission to view/edit members (is owner or is collaborator)
async function verifyBoardAccess(supabase: any, boardId: string, userId: string, requireEdit = false) {
  // Check if owner
  const { data: board } = await supabase
    .from('boards')
    .select('user_id')
    .eq('id', boardId)
    .single()

  if (board?.user_id === userId) return true

  // Check if collaborator
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .single()

  if (member) {
    if (requireEdit) return member.role === 'editor'
    return true
  }

  return false
}

// ── GET /api/boards/[id]/members ─────────────────────────────────────────────
// Fetch all board members/collaborators
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: boardId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasAccess = await verifyBoardAccess(supabase, boardId, user.id)
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch members joined with profiles
    const { data: members, error } = await supabase
      .from('board_members')
      .select('id, role, created_at, profiles(id, email, full_name, avatar_url)')
      .eq('board_id', boardId)

    if (error) throw error

    // Fetch board owner profile to display as owner in the list
    const { data: board } = await supabase
      .from('boards')
      .select('user_id, profiles(id, email, full_name, avatar_url)')
      .eq('id', boardId)
      .single()

    return NextResponse.json({
      members: members || [],
      owner: board ? { id: board.user_id, ...board.profiles, role: 'owner' } : null
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST /api/boards/[id]/members ────────────────────────────────────────────
// Invite a member to the board by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: boardId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only owner or editor collaborators can invite
    const canInvite = await verifyBoardAccess(supabase, boardId, user.id, true)
    if (!canInvite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const email = body.email?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    // Find the profile for this email
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('email', email)
      .maybeSingle()

    if (profileErr) throw profileErr
    if (!profile) return NextResponse.json({ error: 'User with this email not found' }, { status: 404 })

    // Add user as a board member
    const { data: member, error: insertErr } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: profile.id,
        role: 'editor'
      })
      .select()
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'User is already a collaborator on this board' }, { status: 409 })
      }
      throw insertErr
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        role: member.role,
        created_at: member.created_at,
        profiles: profile
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
