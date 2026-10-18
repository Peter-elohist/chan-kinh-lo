-- 0006 · Security: private content behind an allowlist (applied on Supabase in several parts).
-- Content (lessons, questions, verses, rootlets, topics, tiers, realms) no longer ships with the website.
-- It lives in public.content and is readable only by signed-in accounts listed in public.allowed_emails.

create table if not exists public.allowed_emails (email text primary key check (email = lower(email)), note text, added_at timestamptz not null default now());
alter table public.allowed_emails enable row level security;          -- no policies: invisible through the API
insert into public.allowed_emails(email, note) values ('nguyenlqda2@gmail.com', 'owner') on conflict do nothing;

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.allowed_emails a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke execute on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

create table if not exists public.content (key text primary key, body jsonb not null, updated_at timestamptz not null default now());
alter table public.content enable row level security;
create policy "content: allowed read" on public.content for select to authenticated using ((select public.is_allowed()));

-- Writes and private media also require the allowlist.
alter policy "attempts: insert own" on public.attempts with check ((select auth.uid()) = user_id and (select public.is_allowed()));
alter policy "profiles: insert own" on public.profiles with check ((select auth.uid()) = user_id and (select public.is_allowed()));
alter policy "media: signed-in read" on storage.objects using (bucket_id = 'media' and (select public.is_allowed()));

-- Duel RPCs: create_duel / submit_duel raise 'Tài khoản chưa được cấp quyền.' and cap payload sizes;
-- get_duel / duel_week_board return nothing unless is_allowed().

-- To grant a friend access (Supabase → SQL Editor):
--   insert into public.allowed_emails(email, note) values ('ban@gmail.com', 'bạn song đấu');
-- To revoke:
--   delete from public.allowed_emails where email = 'ban@gmail.com';
-- To update content after editing data/*.json, re-run scripts/upload_content.py (prints SQL to paste).
