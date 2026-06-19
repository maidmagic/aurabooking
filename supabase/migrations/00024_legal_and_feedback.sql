-- Migration: Legal pages support and feedback infrastructure
-- Adds tables for feedback submissions and data deletion requests

create table if not exists public.feedback_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.users(id) on delete cascade,
  user_email text not null,
  subject text not null default '',
  description text not null,
  page_url text,
  created_at timestamptz not null default now()
);

comment on table public.feedback_logs is 'User-submitted bug reports and feature requests from the dashboard feedback button';
comment on column public.feedback_logs.tenant_id is 'The user/tenant who submitted the feedback';
comment on column public.feedback_logs.user_email is 'Email of the submitter for follow-up';

create index if not exists idx_feedback_logs_created_at
  on public.feedback_logs(created_at desc);

alter table public.feedback_logs enable row level security;

create policy "Service role has full access to feedback_logs"
  on public.feedback_logs
  as permissive
  for all
  using (true)
  with check (true);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('deletion', 'access', 'rectification', 'portability')),
  full_name text not null,
  email text not null,
  phone text,
  details text default '',
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.data_deletion_requests is 'GDPR/CCPA data subject requests submitted through the legal pages';

create index if not exists idx_data_deletion_requests_status
  on public.data_deletion_requests(status);

alter table public.data_deletion_requests enable row level security;

create policy "Service role has full access to data_deletion_requests"
  on public.data_deletion_requests
  as permissive
  for all
  using (true)
  with check (true);
