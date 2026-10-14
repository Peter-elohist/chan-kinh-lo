-- Chân Kinh Lộ · 0001: lưu kết quả thí luyện.
-- Nội dung bài học nằm trong data/*.json (git). Supabase chỉ giữ tiến độ của người chơi.

create table if not exists public.attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('lesson', 'rootlet')),
  ref         text not null,            -- '1.1' cho bài EA, tên ghi chú cho rễ phụ
  score       smallint not null check (score between 0 and 100),
  correct     smallint not null,
  total       smallint not null,
  wrong       jsonb not null default '[]'::jsonb,   -- câu sai để ôn lại
  created_at  timestamptz not null default now()
);

create index if not exists attempts_user_ref_idx on public.attempts (user_id, kind, ref);

alter table public.attempts enable row level security;

create policy "attempts: read own"   on public.attempts for select using (auth.uid() = user_id);
create policy "attempts: insert own" on public.attempts for insert with check (auth.uid() = user_id);
-- Không có update/delete: lịch sử thí luyện chỉ thêm, không sửa.

create or replace view public.best_scores
with (security_invoker = true) as
select user_id, kind, ref,
       max(score)      as best,
       count(*)::int   as attempts,
       max(created_at) as last_at
from public.attempts
group by user_id, kind, ref;
