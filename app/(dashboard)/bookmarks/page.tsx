import { createServerSupabaseClient } from '@/lib/supabase-server'
import BookmarkGrid from '@/components/BookmarkGrid'

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; q?: string; tag?: string }>
}) {
    const params = await searchParams
    const siteFilter = params.site || ''

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user!.id)
        .order('saved_at', { ascending: false })

    if (siteFilter) query = query.eq('site', siteFilter)

    const [bookmarksRes, profileRes] = await Promise.all([
        query,
        supabase
            .from('profiles')
            .select('plan, subscription_status')
            .eq('id', user!.id)
            .single()
    ])

    const bookmarks = bookmarksRes.data
    const profile = profileRes.data

    const siteLabel = siteFilter === 'youtube' ? 'YouTube' : siteFilter === 'instagram' ? 'Instagram' : 'My'

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">{siteLabel} Bookmarks</h1>
                <p className="text-zinc-500 text-sm mt-1">
                    {bookmarks?.length || 0} saved
                    {profile?.plan === 'free' && (
                        <span className="ml-2 text-violet-400">· Free plan (10 max)</span>
                    )}
                </p>
            </div>
            <BookmarkGrid
                initialBookmarks={bookmarks || []}
                plan={profile?.plan || 'free'}
                initialSite={siteFilter}
            />
        </div>
    )
}