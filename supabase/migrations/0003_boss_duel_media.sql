-- Chân Kinh Lộ · 0003: vượt ải (boss), song đấu (duel), và kho nhạc riêng tư.

-- Boss attempts live in the same ledger.
alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts add constraint attempts_kind_check check (kind in ('lesson', 'rootlet', 'mix', 'debate', 'daily', 'boss'));

-- Duels: one seeded trial, many players, compared by score.
create table if not exists public.duels (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  mode        text not null check (mode in ('basic', 'rootlet', 'mix', 'debate')),
  title       text not null,
  spec        jsonb not null,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);
create table if not exists public.duel_entries (
  duel_id     uuid not null references public.duels(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  score       smallint not null check (score between 0 and 100),
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (duel_id, user_id)
);
create index if not exists duel_entries_user_idx on public.duel_entries (user_id);
create index if not exists duels_created_by_idx on public.duels (created_by);
alter table public.duels enable row level security;
alter table public.duel_entries enable row level security;
-- Direct reads: only your own rows. Everything shared goes through the functions below, which need the code.
create policy "duels: read own" on public.duels for select to authenticated using ((select auth.uid()) = created_by);
create policy "duel_entries: read own" on public.duel_entries for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.get_duel(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', d.code, 'mode', d.mode, 'title', d.title, 'spec', d.spec, 'created_at', d.created_at, 'expires_at', d.expires_at,
    'mine', d.created_by = auth.uid(),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('name', e.name, 'score', e.score, 'me', e.user_id = auth.uid(), 'at', e.created_at) order by e.score desc, e.created_at)
                         from public.duel_entries e where e.duel_id = d.id), '[]'::jsonb))
  from public.duels d
  where d.code = upper(p_code) and auth.uid() is not null;
$$;

create or replace function public.create_duel(p_mode text, p_title text, p_spec jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Cần đăng nhập.'; end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.duels where code = c);
  end loop;
  insert into public.duels (code, mode, title, spec, created_by) values (c, p_mode, left(p_title, 120), p_spec, auth.uid());
  return c;
end $$;

create or replace function public.submit_duel(p_code text, p_name text, p_score int, p_detail jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.duels;
begin
  if auth.uid() is null then raise exception 'Cần đăng nhập.'; end if;
  select * into d from public.duels where code = upper(p_code);
  if d.id is null then raise exception 'Không tìm thấy trận.'; end if;
  if d.expires_at < now() then raise exception 'Trận đã hết hạn.'; end if;
  insert into public.duel_entries (duel_id, user_id, name, score, detail)
  values (d.id, auth.uid(), left(coalesce(nullif(trim(p_name), ''), 'Đạo hữu'), 40), greatest(0, least(100, p_score)), coalesce(p_detail, '{}'::jsonb))
  on conflict (duel_id, user_id) do nothing;   -- first result is final
  return public.get_duel(p_code);
end $$;

create or replace function public.my_duels() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('code', d.code, 'title', d.title, 'mode', d.mode, 'created_at', d.created_at) as x
    from public.duels d
    where d.created_by = auth.uid() or exists (select 1 from public.duel_entries e where e.duel_id = d.id and e.user_id = auth.uid())
    order by d.created_at desc limit 20) s;
$$;

revoke execute on function public.get_duel(text), public.create_duel(text, text, jsonb), public.submit_duel(text, text, int, jsonb), public.my_duels() from public, anon;
grant execute on function public.get_duel(text), public.create_duel(text, text, jsonb), public.submit_duel(text, text, int, jsonb), public.my_duels() to authenticated;

-- Private media bucket for the Linh khí music (personal use; not in the public repo).
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;
create policy "media: signed-in read" on storage.objects for select to authenticated using (bucket_id = 'media');
