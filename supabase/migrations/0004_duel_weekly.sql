-- Chân Kinh Lộ · 0004: sổ điểm song đấu theo tuần.
-- Mỗi khi có người nộp điểm một trận, kết quả trận được tính lại vào duel_results
-- (thắng 3 điểm, hoà 1, thua 0; trận mới có 1 người là "chờ").
-- Tuần tính theo giờ Việt Nam, bắt đầu thứ Hai.

create table if not exists public.duel_results (
  duel_id     uuid not null references public.duels(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  name        text not null,
  score       smallint not null,
  outcome     text not null check (outcome in ('win', 'draw', 'loss', 'pending')),
  points      smallint not null default 0,
  rivals      smallint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (duel_id, user_id)
);
create index if not exists duel_results_week_idx on public.duel_results (week_start, user_id);
create index if not exists duel_results_user_idx on public.duel_results (user_id, week_start);
alter table public.duel_results enable row level security;
create policy "duel_results: read own" on public.duel_results for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.week_of(t timestamptz) returns date
language sql immutable set search_path = '' as $$ select date_trunc('week', t at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- Recompute every player's outcome in one duel.
create or replace function public.recompute_duel(p_duel uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n int; top int; ntop int; wk date;
begin
  select count(*), max(score) into n, top from public.duel_entries where duel_id = p_duel;
  select count(*) into ntop from public.duel_entries where duel_id = p_duel and score = top;
  select public.week_of(created_at) into wk from public.duels where id = p_duel;
  insert into public.duel_results (duel_id, user_id, week_start, name, score, outcome, points, rivals, updated_at)
  select e.duel_id, e.user_id, wk, e.name, e.score,
         case when n < 2 then 'pending' when e.score = top and ntop = 1 then 'win' when e.score = top then 'draw' else 'loss' end,
         case when n < 2 then 0 when e.score = top and ntop = 1 then 3 when e.score = top then 1 else 0 end,
         n - 1, now()
  from public.duel_entries e where e.duel_id = p_duel
  on conflict (duel_id, user_id) do update set score = excluded.score, outcome = excluded.outcome, points = excluded.points, rivals = excluded.rivals, name = excluded.name, updated_at = now();
end $$;
revoke execute on function public.recompute_duel(uuid) from public, anon, authenticated;

create or replace function public.on_duel_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.recompute_duel(new.duel_id); return new; end $$;
revoke execute on function public.on_duel_entry() from public, anon, authenticated;
drop trigger if exists duel_entry_results on public.duel_entries;
create trigger duel_entry_results after insert on public.duel_entries for each row execute function public.on_duel_entry();

-- Weekly totals per user (each user reads only their own through RLS on duel_results).
create or replace view public.duel_weekly with (security_invoker = true) as
select user_id, week_start,
       count(*) filter (where outcome <> 'pending')::int as played,
       count(*) filter (where outcome = 'win')::int      as wins,
       count(*) filter (where outcome = 'draw')::int     as draws,
       count(*) filter (where outcome = 'loss')::int     as losses,
       count(*) filter (where outcome = 'pending')::int  as pending,
       sum(points)::int                                   as points,
       round(avg(score))::int                             as avg_score,
       max(score)::int                                    as best_score
from public.duel_results group by user_id, week_start;

-- Public leaderboard for one week (names and totals only) plus the caller's own line and titles.
create or replace function public.duel_week_board(p_week date default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with wk as (select coalesce(p_week, public.week_of(now())) as w),
  agg as (
    select r.user_id, (array_agg(r.name order by r.updated_at desc))[1] as name,
           count(*) filter (where r.outcome <> 'pending')::int as played,
           count(*) filter (where r.outcome = 'win')::int as wins,
           count(*) filter (where r.outcome = 'draw')::int as draws,
           count(*) filter (where r.outcome = 'loss')::int as losses,
           sum(r.points)::int as points, round(avg(r.score))::int as avg_score, max(r.score)::int as best_score
    from public.duel_results r, wk where r.week_start = wk.w group by r.user_id),
  ranked as (select a.*, rank() over (order by points desc, wins desc, avg_score desc) as rk from agg a)
  select jsonb_build_object(
    'week', (select w from wk),
    'board', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'points', points, 'wins', wins, 'draws', draws, 'losses', losses, 'played', played, 'avg', avg_score, 'me', user_id = auth.uid()) order by rk) from ranked where rk <= 20), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rk, 'points', points, 'wins', wins, 'draws', draws, 'losses', losses, 'played', played, 'avg', avg_score, 'best', best_score,
             'titles', to_jsonb(array_remove(array[
               case when rk = 1 and points > 0 then 'Võ lâm minh chủ tuần' end,
               case when wins >= 5 then 'Chiến thần' end,
               case when wins >= 3 and losses = 0 then 'Bất bại' end,
               case when best_score = 100 then 'Nhất kích tất sát' end,
               case when played >= 7 then 'Cần cù' end], null)))
           from ranked where user_id = auth.uid()))
  where auth.uid() is not null;
$$;
revoke execute on function public.duel_week_board(date) from public, anon;
grant execute on function public.duel_week_board(date) to authenticated;
