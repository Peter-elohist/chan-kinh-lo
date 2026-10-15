-- Chân Kinh Lộ · 0005: hồ sơ (tên hiển thị) và lịch sử song đấu chi tiết.

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- get_duel now also shares each player's summary (correct, total, avg_ms) so a match can explain itself.
create or replace function public.get_duel(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', d.code, 'mode', d.mode, 'title', d.title, 'spec', d.spec, 'created_at', d.created_at, 'expires_at', d.expires_at,
    'mine', d.created_by = auth.uid(),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('name', e.name, 'score', e.score, 'me', e.user_id = auth.uid(), 'at', e.created_at,
                          'correct', e.detail->'correct', 'total', e.detail->'total', 'avg_ms', e.detail->'avg_ms') order by e.score desc, e.created_at)
                         from public.duel_entries e where e.duel_id = d.id), '[]'::jsonb))
  from public.duels d
  where d.code = upper(p_code) and auth.uid() is not null;
$$;

-- Bảng Phong Thần Chiến: my matches with my full detail and rivals' summaries only.
create or replace function public.my_duel_history(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'code', d.code, 'title', d.title, 'mode', d.mode, 'at', me.created_at,
      'outcome', coalesce(r.outcome, 'pending'), 'points', coalesce(r.points, 0),
      'me', jsonb_build_object('name', me.name, 'score', me.score, 'detail', me.detail),
      'others', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'score', o.score, 'correct', o.detail->'correct', 'total', o.detail->'total', 'avg_ms', o.detail->'avg_ms') order by o.score desc)
                          from public.duel_entries o where o.duel_id = d.id and o.user_id <> me.user_id), '[]'::jsonb)) as x
    from public.duel_entries me
    join public.duels d on d.id = me.duel_id
    left join public.duel_results r on r.duel_id = me.duel_id and r.user_id = me.user_id
    where me.user_id = auth.uid()
    order by me.created_at desc
    limit least(greatest(p_limit, 1), 100)) s;
$$;
grant execute on function public.my_duel_history(int) to authenticated;
revoke execute on function public.my_duel_history(int) from public, anon;
