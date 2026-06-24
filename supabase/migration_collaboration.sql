-- ── Board Members (Collaborators) ─────────────────────────────────────────────
create table if not exists public.board_members (
  id          uuid default uuid_generate_v4() primary key,
  board_id    uuid references public.boards(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  role        text not null default 'editor', -- 'editor' | 'viewer'
  created_at  timestamptz default now(),
  unique(board_id, user_id)
);

-- Enable RLS
alter table public.board_members enable row level security;

-- 1. Helper function to check board ownership without RLS recursion
create or replace function public.check_board_owner(p_board_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.boards
    where id = p_board_id and user_id = p_user_id
  );
$$;

-- Policies for board_members
create policy "board_members_select" on public.board_members for select using (
  public.check_board_owner(board_id, auth.uid()) or
  user_id = auth.uid()
);

create policy "board_members_insert" on public.board_members for insert with check (
  public.check_board_owner(board_id, auth.uid())
);

create policy "board_members_delete" on public.board_members for delete using (
  public.check_board_owner(board_id, auth.uid())
);

-- ── Update Boards policies to allow members select ────────────────────────────
create policy "boards_member_select" on public.boards for select using (
  exists (select 1 from public.board_members bm where bm.board_id = id and bm.user_id = auth.uid())
);

-- ── Update Board Items policies to allow members read/write ───────────────────
create policy "board_items_member_select" on public.board_items for select using (
  exists (select 1 from public.board_members bm where bm.board_id = board_id and bm.user_id = auth.uid())
);

create policy "board_items_member_insert" on public.board_items for insert with check (
  exists (select 1 from public.board_members bm where bm.board_id = board_id and bm.user_id = auth.uid() and bm.role = 'editor')
);

create policy "board_items_member_update" on public.board_items for update using (
  exists (select 1 from public.board_members bm where bm.board_id = board_id and bm.user_id = auth.uid() and bm.role = 'editor')
);

create policy "board_items_member_delete" on public.board_items for delete using (
  exists (select 1 from public.board_members bm where bm.board_id = board_id and bm.user_id = auth.uid() and bm.role = 'editor')
);

-- ── Board Item Comments ───────────────────────────────────────────────────────
create table if not exists public.board_item_comments (
  id            uuid default uuid_generate_v4() primary key,
  board_item_id uuid references public.board_items(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  text          text not null,
  created_at    timestamptz default now()
);

-- Enable RLS
alter table public.board_item_comments enable row level security;

-- Policies for board_item_comments
create policy "comments_select" on public.board_item_comments for select using (
  exists (
    select 1 from public.board_items bi
    join public.boards b on b.id = bi.board_id
    left join public.board_members bm on bm.board_id = b.id
    where bi.id = board_item_id
      and (b.user_id = auth.uid() or bm.user_id = auth.uid() or b.is_public = true)
  )
);

create policy "comments_insert" on public.board_item_comments for insert with check (
  exists (
    select 1 from public.board_items bi
    join public.boards b on b.id = bi.board_id
    left join public.board_members bm on bm.board_id = b.id
    where bi.id = board_item_id
      and (b.user_id = auth.uid() or bm.user_id = auth.uid())
  )
);

create policy "comments_delete" on public.board_item_comments for delete using (
  user_id = auth.uid() or exists (
    select 1 from public.board_items bi
    join public.boards b on b.id = bi.board_id
    where bi.id = board_item_id and b.user_id = auth.uid()
  )
);

-- ── Profiles RLS policy update (for collaborator name & email display) ────────
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
