import { createServerSupabaseClient } from '@/lib/supabase-server'
import BoardEditor from '@/components/BoardEditor'
import { notFound } from 'next/navigation'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: board } = await supabase.from('boards').select('*').eq('id', id).single()
  if (!board) notFound()

  const isOwner = board.user_id === user!.id
  const { data: member } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', id)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!isOwner && !member) notFound()

  const { data: items } = await supabase
    .from('board_items')
    .select(`
      *,
      bookmark:bookmarks(*),
      comments:board_item_comments(
        id,
        text,
        created_at,
        user_id,
        profiles(id, email, full_name, avatar_url)
      )
    `)
    .eq('board_id', id)
    .order('position', { ascending: true })

  // All bookmarks for "add to board" picker
  const { data: allBookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user!.id)
    .order('saved_at', { ascending: false })

  return (
    <BoardEditor
      board={board}
      initialItems={items || []}
      allBookmarks={allBookmarks || []}
      userId={user!.id}
    />
  )
}
