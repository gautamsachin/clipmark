import { createAdminClient } from '@/lib/supabase-server'
import BoardEditor from '@/components/BoardEditor'
import { notFound } from 'next/navigation'
import { Bookmark } from 'lucide-react'

export default async function PublicBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: board } = await admin
    .from('boards')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single()

  if (!board) notFound()

  // Fetch board items with bookmark data and comments/discussion
  const { data: items } = await admin
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
    .eq('board_id', board.id)
    .order('position', { ascending: true })

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 flex-shrink-0 select-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Bookmark className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="text-white font-bold text-sm">Clipmark</span>
      </div>

      {/* Board Canvas Editor in read-only mode */}
      <BoardEditor
        board={board}
        initialItems={items || []}
        allBookmarks={[]}
        userId=""
        readOnly={true}
      />
    </div>
  )
}
