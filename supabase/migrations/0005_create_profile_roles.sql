-- Stage 1: roles assigned to user profiles. A user may hold several roles.
-- Local migration only. Do not run manually until approved.

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);

create index if not exists profile_roles_role_active_idx
on public.profile_roles (role_id, is_active);

alter table public.profile_roles enable row level security;
