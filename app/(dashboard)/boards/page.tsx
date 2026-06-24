import { createServerSupabaseClient } from '@/lib/supabase-server'
import BoardsClient from '@/components/BoardsClient'
import { redirect } from 'next/navigation'

export default async function BoardsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch owned boards
  const { data: boards } = await supabase
    .from('boards')
    .select('*, board_items(count)')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  // Fetch boards where the user is a collaborator
  const { data: memberships } = await supabase
    .from('board_members')
    .select('role, boards(*, board_items(count))')
    .eq('user_id', user!.id)

  const ownedBoards = (boards || []).map(b => ({
    ...b,
    is_owner: true,
    role: 'owner'
  }))

  const sharedBoards = (memberships || [])
    .map((m: any) => {
      if (!m.boards) return null
      return {
        ...m.boards,
        is_owner: false,
        role: m.role
      }
    })
    .filter(Boolean)

  const allBoards = [...ownedBoards, ...sharedBoards]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Boards</h1>
        <p className="text-zinc-500 text-sm mt-1">Moodboards and storyboards from your bookmarks</p>
      </div>
      <BoardsClient initialBoards={allBoards} userId={user!.id} />
    </div>
  )
}
