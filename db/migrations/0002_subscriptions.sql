-- M2: subscription columns on users for Stripe-backed plans.
-- Apply via Supabase SQL Editor or `supabase db push`.

alter table public.users
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'pro', 'business')),
  add column if not exists subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'past_due', 'cancelled')),
  add column if not exists subscription_interval text
    check (subscription_interval in ('monthly', 'annual')),
  add column if not exists subscription_current_period_end timestamptz;

-- Lookup index for the webhook handler which finds users by stripe customer id.
create index if not exists users_stripe_customer_id_idx
  on public.users (stripe_customer_id);

-- RLS: users can already select their own row from the M1 migration. Subscription
-- fields are user-facing data they're allowed to see. No new policy needed.
-- The webhook handler writes via service-role and bypasses RLS.
