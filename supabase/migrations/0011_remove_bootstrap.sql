-- Stage 1: remove the one-time bootstrap surface.
-- LOCAL MIGRATION ONLY. DO NOT EXECUTE WITH THIS FILE.
--
-- EXACT STAGING SEQUENCE (do not reorder or skip a step):
--   1. Apply 0001 through 0009 in filename order on an empty staging project.
--      Stop at 0009; do not apply 0011 yet.
--   2. In Supabase Auth, create the first Super Admin's user and confirm the
--      email address (email_confirmed_at must be set).
--   3. In the SQL Editor, run:
--        select public.bootstrap_first_super_admin('<verified-admin-email>');
--      The function refuses to run unless the email is confirmed and no active
--      Super Admin exists. It creates an active profile and an active
--      super_admin role assignment.
--   4. Sign in as that user in staging and confirm the protected /dashboard
--      loads. The application proxy requires an active profile and an active
--      role assignment; confirm the role list includes super_admin.
--   5. Run the pre-flight check below. All four results must be satisfied:
--        - guard_present = true
--        - guard_allowed = false
--        - active_super_admins >= 1
--        - verified_super_admins >= 1
--   6. Only then apply this migration. Its DO block repeats these checks and
--      raises an exception before any destructive change if any check fails.
--   7. Continue with 0012 through 0022 in filename order.
--
-- The database can verify the Auth email, active profile, and active role
-- assignment. The interactive sign-in/dashboard check in step 4 is a manual
-- release gate that cannot be expressed as a SQL assertion, so it must be
-- recorded by the operator before applying this migration.
--
-- Order matters: the replacement trigger is installed before the guard table is
-- dropped, and the bootstrap function is dropped last. Normal Super Admin
-- management keeps working because the replacement trigger still requires
-- public.is_super_admin(), still takes the advisory lock, and still blocks
-- removal of the last active Super Admin.
--
-- Pre-flight query (run manually in staging before applying this migration):
--   select
--     to_regclass('public.super_admin_bootstrap_guard') is not null as guard_present,
--     (select allowed from public.super_admin_bootstrap_guard where singleton) as guard_allowed,
--     public.active_super_admin_count() as active_super_admins,
--     (
--       select count(*)
--       from public.profiles p
--       join public.profile_roles pr on pr.profile_id = p.id
--       join public.roles r on r.id = pr.role_id
--       join auth.users u on u.id = p.id
--       where p.is_active
--         and pr.is_active
--         and r.is_active
--         and r.name = 'super_admin'
--         and u.email_confirmed_at is not null
--     )::integer as verified_super_admins;

-- Fail closed before any destructive change unless the first Super Admin state
-- is fully verified. The same advisory lock used by all Super Admin mutations is
-- acquired here and remains held until the migration transaction commits.
do $$
declare
  v_guard_present boolean;
  v_guard_allowed boolean;
  v_active_super_admins integer;
  v_verified_super_admins integer;
begin
  perform public.lock_super_admin_registry();

  v_active_super_admins := public.active_super_admin_count();
  select to_regclass('public.super_admin_bootstrap_guard') is not null
  into v_guard_present;

  if not v_guard_present then
    raise exception
      'Refusing to remove bootstrap: guard table is missing; bootstrap completion cannot be verified.'
      using errcode = 'check_violation';
  end if;

  select g.allowed
  into v_guard_allowed
  from public.super_admin_bootstrap_guard g
  where g.singleton;

  -- NULL or true means the one-time bootstrap window is still open.
  if v_guard_allowed is distinct from false then
    raise exception
      'Refusing to remove bootstrap: the one-time bootstrap guard is still open. Complete 0009 first.'
      using errcode = 'check_violation';
  end if;

  if v_active_super_admins < 1 then
    raise exception
      'Refusing to remove bootstrap: no active Super Admin exists. Run 0009 first.'
      using errcode = 'check_violation';
  end if;

  -- Verifies an active profile, an active super_admin role assignment, an active
  -- role, and a confirmed Supabase Auth email. The interactive /dashboard sign-in
  -- check remains a manual staging gate documented in the header.
  select count(*)::integer
  into v_verified_super_admins
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  join auth.users u on u.id = p.id
  where p.is_active
    and pr.is_active
    and r.is_active
    and r.name = 'super_admin'
    and u.email_confirmed_at is not null;

  if v_verified_super_admins < 1 then
    raise exception
      'Refusing to remove bootstrap: no active Super Admin has a confirmed email and an active profile/role assignment.'
      using errcode = 'check_violation';
  end if;
end
$$;

-- Replace the role-assignment trigger first so nothing references the guard.
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

-- The existing trigger definition still points at this function name, so no
-- trigger recreation is required. Recreate it anyway to keep the migration
-- self-contained if it is ever replayed on a fresh database.
drop trigger if exists protect_super_admin_role_assignment on public.profile_roles;
create trigger protect_super_admin_role_assignment
before insert or update or delete on public.profile_roles
for each row execute function public.protect_super_admin_role_assignment();

-- No bootstrap helper is needed after the first Super Admin is verified.
drop table if exists public.super_admin_bootstrap_guard;

drop function if exists public.bootstrap_first_super_admin(text);

-- Suggested post-flight checks (run manually, not here):
--   select count(*) from pg_proc
--     where pronamespace = 'public'::regnamespace
--       and proname = 'bootstrap_first_super_admin';
--   select count(*) from pg_class
--     where relnamespace = 'public'::regnamespace
--       and relname = 'super_admin_bootstrap_guard';
-- Expected: both counts are 0, and normal Super Admin role assignment still works.
