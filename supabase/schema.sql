-- ── Enable extensions ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ── Users (mirrors Supabase auth.users) ──────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  avatar_url    text,
  plan          text not null default 'free', -- 'free' | 'pro'
  razorpay_customer_id    text,
  razorpay_subscription_id text,
  subscription_status     text default 'inactive', -- 'active' | 'inactive' | 'cancelled'
  plan_expires_at         timestamptz,
  created_at    timestamptz default now()
);

-- ── Bookmarks ─────────────────────────────────────────────────────────────────
create table public.bookmarks (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  video_id       text not null,           -- YT video ID or IG reel ID
  site           text not null,           -- 'youtube' | 'instagram'
  url            text not null,
  title          text,                    -- video title
  timestamp      integer not null default 0,  -- seconds
  notes          text,
  tags           text[] default '{}',
  screenshot_url text,
  saved_at       timestamptz default now(),
  created_at     timestamptz default now(),
  unique(user_id, video_id)
);

-- ── Immutable helper functions for indexing ───────────────────────────────────
-- PostgreSQL requires index expressions to be IMMUTABLE.
-- We wrap tsvector generation in IMMUTABLE functions so the index is accepted.

create or replace function public.bookmark_notes_tsvector(notes text)
returns tsvector as $$
  select to_tsvector('english'::regconfig, coalesce(notes, ''))
$$ language sql immutable parallel safe;

create or replace function public.bookmark_search_tsvector(notes text, tags text[])
returns tsvector as $$
  select to_tsvector(
    'english'::regconfig,
    coalesce(notes, '') || ' ' || coalesce(array_to_string(tags, ' '), '')
  )
$$ language sql immutable parallel safe;

-- ── Full-text search indexes ──────────────────────────────────────────────────
create index bookmarks_tags_idx   on public.bookmarks using gin(tags);
create index bookmarks_notes_idx  on public.bookmarks using gin(public.bookmark_notes_tsvector(notes));
create index bookmarks_search_idx on public.bookmarks using gin(public.bookmark_search_tsvector(notes, tags));

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.bookmarks enable row level security;

-- Profiles: users can select any profile (crucial for collaborator display & search) but edit only their own
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- Bookmarks: users can only see/edit their own
create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_update" on public.bookmarks for update using (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Search function ───────────────────────────────────────────────────────────
create or replace function search_bookmarks(
  p_user_id uuid,
  p_query   text
)
returns setof public.bookmarks as $$
begin
  return query
  select * from public.bookmarks
  where user_id = p_user_id
    and (
      p_query = '' or
      public.bookmark_search_tsvector(notes, tags) @@ plainto_tsquery('english', p_query)
      or exists (
        select 1 from unnest(tags) t where t ilike '%' || p_query || '%'
      )
      or notes ilike '%' || p_query || '%'
    )
  order by saved_at desc;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION v2 — Collections, Boards, Sync tokens
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Collections (folders) ────────────────────────────────────────────────────
create table public.collections (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  color       text default '#7c3aed',
  created_at  timestamptz default now()
);
alter table public.collections enable row level security;
create policy "collections_all" on public.collections for all using (auth.uid() = user_id);

-- Add collection FK to bookmarks
alter table public.bookmarks add column if not exists collection_id uuid references public.collections(id) on delete set null;

-- ── Boards (moodboards / storyboards) ────────────────────────────────────────
create table public.boards (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  title         text not null,
  description   text,
  cover_url     text,
  is_public     boolean default false,
  public_slug   text unique,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.boards enable row level security;
create policy "boards_owner"  on public.boards for all using (auth.uid() = user_id);
create policy "boards_public" on public.boards for select using (is_public = true);

-- ── Board items (bookmarks pinned to a board) ─────────────────────────────────
create table public.board_items (
  id            uuid default uuid_generate_v4() primary key,
  board_id      uuid references public.boards(id) on delete cascade not null,
  bookmark_id   uuid references public.bookmarks(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  position      integer default 0,
  card_note     text,
  created_at    timestamptz default now(),
  unique(board_id, bookmark_id)
);
alter table public.board_items enable row level security;
create policy "board_items_owner"  on public.board_items for all using (auth.uid() = user_id);
create policy "board_items_public" on public.board_items for select using (
  exists (select 1 from public.boards b where b.id = board_id and b.is_public = true)
);

-- ── Sync tokens (extension ↔ dashboard live sync) ─────────────────────────────
create table public.sync_tokens (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null unique,
  token       text not null unique,
  created_at  timestamptz default now()
);
alter table public.sync_tokens enable row level security;
create policy "sync_tokens_all" on public.sync_tokens for all using (auth.uid() = user_id);

-- ── Board updated_at trigger ──────────────────────────────────────────────────
create or replace function update_board_timestamp()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger boards_updated_at before update on public.boards
  for each row execute procedure update_board_timestamp();