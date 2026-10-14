-- Chân Kinh Lộ · 0002: sổ thí luyện có EXP, độ khó, chủ đề, và chi tiết (biên bản luận chiến, nhiệm vụ hằng ngày).
alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts add constraint attempts_kind_check check (kind in ('lesson', 'rootlet', 'mix', 'debate', 'daily'));
alter table public.attempts
  add column if not exists mode       text,
  add column if not exists difficulty smallint not null default 1 check (difficulty between 0 and 4),
  add column if not exists topic      text,
  add column if not exists exp        integer  not null default 0 check (exp between 0 and 1000),
  add column if not exists detail     jsonb    not null default '{}'::jsonb;
alter table public.attempts alter column correct set default 0;
alter table public.attempts alter column total   set default 0;
create index if not exists attempts_user_time_idx on public.attempts (user_id, created_at);
