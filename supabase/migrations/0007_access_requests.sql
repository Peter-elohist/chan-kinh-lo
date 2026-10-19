-- 0007 · Người mới xin vào núi → chủ app duyệt MỘT lần (qua email hoặc trang /#admin) → từ đó đăng nhập vào thẳng.
-- Áp dụng qua MCP với tên access_requests_admin + decide_access_role_check. Edge Function: supabase/functions/access.
alter table public.allowed_emails add column if not exists admin boolean not null default false;
update public.allowed_emails set admin = true where email = 'nguyenlqda2@gmail.com';
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null, name text,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(), decided_at timestamptz);
alter table public.access_requests enable row level security;   -- no policies: only reachable through the functions below
-- Functions (security definer): is_admin(), request_access(), admin_overview(), decide_access(email, approve).
-- See the live definitions with:  select pg_get_functiondef('public.decide_access(text,boolean)'::regprocedure);
--
-- Thủ công trong SQL Editor (nếu cần):
--   select * from public.access_requests order by created_at desc;            -- xem ai đang chờ
--   insert into public.allowed_emails(email, note) values ('ban@gmail.com','duyệt tay');  -- duyệt
--   delete from public.allowed_emails where email = 'ban@gmail.com' and not admin;        -- thu hồi
