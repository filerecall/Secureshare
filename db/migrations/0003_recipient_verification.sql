-- M3: recipient verification ("only the intended reader can open it").
--
-- A share link can now require the opener to prove control of the recipient
-- mailbox before the document is served: they enter their email, we post a
-- 6-digit code to the address the link was issued to, and only that code
-- unlocks the view. A forwarded link is then useless to anyone who can't read
-- the original recipient's inbox.
--
-- Apply via Supabase SQL Editor or `supabase db push`.

-- ──────────────────────────────────────────────────────────────────
-- share_links: per-link opt-in
-- ──────────────────────────────────────────────────────────────────
alter table public.share_links
  add column if not exists require_email_verification boolean not null default false;

-- ──────────────────────────────────────────────────────────────────
-- link_verification_codes
--
-- Codes are stored HASHED. A leaked database row must not hand anyone a
-- working code, and we never need the plaintext again - confirmation
-- re-hashes what the recipient typed and compares.
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.link_verification_codes (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists link_verification_codes_share_link_id_idx
  on public.link_verification_codes (share_link_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- No policies by design. The recipient is unauthenticated, so every read and
-- write goes through the service-role client in the app, which bypasses RLS.
-- Enabling RLS with no policy means anon/authenticated clients can't touch
-- this table at all - which is exactly what we want for one-time codes.
-- ──────────────────────────────────────────────────────────────────
alter table public.link_verification_codes enable row level security;
