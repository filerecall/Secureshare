-- SecureShare - initial schema
-- Run against a fresh Supabase project (SQL editor or `supabase db push`).
-- All PKs are UUID. RLS is enabled on every table.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────
-- users - mirrors auth.users, populated by trigger below
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- documents
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  s3_key text,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);

-- ──────────────────────────────────────────────────────────────────
-- share_links
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  token text unique not null,
  recipient_email text not null,
  expiry_type text check (expiry_type in ('days', 'first_view', 'manual')),
  expiry_days int,
  expires_at timestamptz,
  revoked_at timestamptz,
  first_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_links_token_idx on public.share_links (token);
create index if not exists share_links_document_id_idx on public.share_links (document_id);

-- ──────────────────────────────────────────────────────────────────
-- access_events
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.access_events (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  event_type text not null check (event_type in ('viewed', 'downloaded', 'blocked')),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists access_events_share_link_id_idx
  on public.access_events (share_link_id);

-- ──────────────────────────────────────────────────────────────────
-- Auth trigger - mirror new auth.users rows into public.users
-- ──────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.share_links enable row level security;
alter table public.access_events enable row level security;

-- users: a user can read their own row
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- documents: full CRUD on rows you own
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- share_links: scoped via parent document ownership
drop policy if exists "share_links_select_own" on public.share_links;
create policy "share_links_select_own" on public.share_links
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = share_links.document_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "share_links_insert_own" on public.share_links;
create policy "share_links_insert_own" on public.share_links
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = share_links.document_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "share_links_update_own" on public.share_links;
create policy "share_links_update_own" on public.share_links
  for update using (
    exists (
      select 1 from public.documents d
      where d.id = share_links.document_id and d.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.documents d
      where d.id = share_links.document_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "share_links_delete_own" on public.share_links;
create policy "share_links_delete_own" on public.share_links
  for delete using (
    exists (
      select 1 from public.documents d
      where d.id = share_links.document_id and d.user_id = auth.uid()
    )
  );

-- access_events: readable only by owner of the underlying document
drop policy if exists "access_events_select_own" on public.access_events;
create policy "access_events_select_own" on public.access_events
  for select using (
    exists (
      select 1
      from public.share_links sl
      join public.documents d on d.id = sl.document_id
      where sl.id = access_events.share_link_id
        and d.user_id = auth.uid()
    )
  );
