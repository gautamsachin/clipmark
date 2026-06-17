import { createServerSupabaseClient } from '@/lib/supabase-server'
import BoardsClient from '@/components/BoardsClient'
import { redirect } from 'next/navigation'

export default async function BoardsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: boards } = await supabase
    .from('boards')
    .select('*, board_items(count)')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })



  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Boards</h1>
        <p className="text-zinc-500 text-sm mt-1">Moodboards and storyboards from your bookmarks</p>
      </div>
      <BoardsClient initialBoards={boards || []} />
    </div>
  )
}
