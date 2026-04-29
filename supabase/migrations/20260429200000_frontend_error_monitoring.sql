create table if not exists public.frontend_error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  source text not null default 'frontend',
  route text,
  user_agent text,
  build text,
  commit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.frontend_error_events enable row level security;

create index if not exists frontend_error_events_created_at_idx
  on public.frontend_error_events (created_at desc);

create index if not exists frontend_error_events_user_id_idx
  on public.frontend_error_events (user_id);

drop policy if exists "frontend errors insert own" on public.frontend_error_events;
create policy "frontend errors insert own"
  on public.frontend_error_events
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "frontend errors admin read" on public.frontend_error_events;
create policy "frontend errors admin read"
  on public.frontend_error_events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
