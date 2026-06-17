import { createServerSupabaseClient } from '@/lib/supabase-server'
import BookmarkGrid from '@/components/BookmarkGrid'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user!.id)
    .order('saved_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Bookmarks</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {bookmarks?.length || 0} saved
          {profile?.plan === 'free' && <span className="ml-2 text-violet-400">· Free plan (10 max)</span>}
        </p>
      </div>
      <BookmarkGrid initialBookmarks={bookmarks || []} plan={profile?.plan || 'free'} />
    </div>
  )
}
