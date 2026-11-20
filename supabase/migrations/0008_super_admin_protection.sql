-- Stage 1: defense-in-depth protection for the Super Admin role.
-- Application checks exist too; these database triggers cannot be bypassed by
-- calling PostgREST directly. Local migration only.

-- One-time bootstrap guard. RLS is enabled with no policy for anon/authenticated,
-- and no privileges are granted to ordinary roles. Only SECURITY DEFINER
-- functions owned by the migration role can read or change this row.
create table if not exists public.super_admin_bootstrap_guard (
  singleton boolean primary key default true check (singleton),
  allowed boolean not null default false
);

alter table public.super_admin_bootstrap_guard enable row level security;
revoke all on public.super_admin_bootstrap_guard from public, anon, authenticated;

insert into public.super_admin_bootstrap_guard (singleton, allowed)
values (true, false)
on conflict (singleton) do nothing;

create or replace function public.active_super_admin_count()
returns integer
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  where p.is_active
    and pr.is_active
    and r.is_active
    and r.name = 'super_admin';
$$;

-- Every caller is a SECURITY DEFINER function or trigger owned by the migration
-- role, so no application/API role needs direct EXECUTE. Revoke the default
-- PUBLIC grant so anon, authenticated and service_role cannot enumerate the
-- active Super Admin count directly. No GRANT follows by design.
revoke all on function public.active_super_admin_count() from public, anon, authenticated, service_role;

-- Blocks deletion or deactivation of the last active Super Admin profile.
create or replace function public.protect_last_super_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_was_active boolean;
  v_will_be_inactive boolean;
  v_is_super_admin boolean := false;
begin
  perform public.lock_super_admin_registry();

  v_was_active := old.is_active;
  if tg_op = 'DELETE' then
    v_will_be_inactive := true;
  else
    v_will_be_inactive := new.is_active = false;
  end if;

  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = old.id
      and pr.is_active
      and r.is_active
      and r.name = 'super_admin'
  )
  into v_is_super_admin;

  if v_was_active
     and v_is_super_admin
     and v_will_be_inactive
     and public.active_super_admin_count() <= 1
  then
    raise exception 'Cannot remove or disable the last active Super Admin.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_last_super_admin_profile on public.profiles;
create trigger protect_last_super_admin_profile
before delete or update of is_active on public.profiles
for each row execute function public.protect_last_super_admin_profile();

-- Blocks unauthorized Super Admin assignment and removal of the last one.
create or replace function public.protect_super_admin_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_role_is_super boolean := false;
  v_old_role_is_super boolean := false;
  v_old_was_active boolean := false;
  v_old_becomes_inactive boolean := false;
begin
  perform public.lock_super_admin_registry();

  if tg_op in ('INSERT', 'UPDATE') then
    select exists (
      select 1
      from public.roles
      where id = new.role_id
        and name = 'super_admin'
        and is_active
    )
    into v_new_role_is_super;

    if v_new_role_is_super
       and new.is_active
       and not public.is_super_admin()
       and not (
         coalesce(
           (select allowed from public.super_admin_bootstrap_guard where singleton),
           false
         )
         and public.active_super_admin_count() = 0
       )
    then
      raise exception 'Only an existing Super Admin can assign the Super Admin role.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    select exists (
      select 1
      from public.roles
      where id = old.role_id
        and name = 'super_admin'
        and is_active
    )
    into v_old_role_is_super;

    v_old_was_active := old.is_active;
    if tg_op = 'DELETE' then
      v_old_becomes_inactive := true;
    else
      v_old_becomes_inactive :=
        (new.is_active = false) or (new.role_id <> old.role_id);
    end if;

    if v_old_role_is_super
       and v_old_was_active
       and v_old_becomes_inactive
       and public.active_super_admin_count() <= 1
    then
      raise exception 'Cannot remove the last active Super Admin role assignment.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_super_admin_role_assignment on public.profile_roles;
create trigger protect_super_admin_role_assignment
before insert or update or delete on public.profile_roles
for each row execute function public.protect_super_admin_role_assignment();

-- Built-in roles cannot be deleted, renamed or disabled.
create or replace function public.protect_system_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.lock_super_admin_registry();

  if tg_op = 'DELETE' and old.is_system then
    raise exception 'Built-in roles cannot be deleted.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE'
     and old.is_system
     and (
       new.name <> old.name
       or new.is_active = false
       or new.is_system = false
     )
  then
    raise exception 'Built-in roles cannot be renamed, disabled or downgraded.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_system_roles on public.roles;
create trigger protect_system_roles
before update or delete on public.roles
for each row execute function public.protect_system_roles();
