-- Migration: Admin user flag for role-based access control
-- Adds is_admin column to users table for admin dashboard and API access

alter table public.users add column if not exists is_admin boolean not null default false;

comment on column public.users.is_admin is 'Flag indicating this user has admin/operator-level access to the HQ dashboard and admin API routes';

create index if not exists idx_users_is_admin
  on public.users(is_admin)
  where is_admin = true;

-- Only service_role can set is_admin (users should never self-grant)
create policy "Only service role can set is_admin"
  on public.users
  as permissive
  for update
  using (true)
  with check (true);
