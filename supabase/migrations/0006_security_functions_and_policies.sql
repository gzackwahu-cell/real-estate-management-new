-- Stage 1: shared security checks and Row Level Security policies.
-- Local migration only. Do not run manually until approved.

-- Transaction-scoped serialization for every operation that can change the
-- active Super Admin count. All protected triggers and bootstrap call this.
create or replace function public.lock_super_admin_registry()
returns void
language sql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
  select pg_advisory_xact_lock(7274619821370891::bigint);
$$;

revoke all on function public.lock_super_admin_registry() from public, anon, authenticated;
grant execute on function public.lock_super_admin_registry() to service_role;

-- True only for a verified, active Super Admin session.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.profiles p on p.id = pr.profile_id
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and pr.is_active
      and p.is_active
      and r.is_active
      and r.name = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated, service_role;

-- Used by application code and RLS. Super Admin always passes.
-- Inactive profiles never receive permissions from this function.
create or replace function public.has_permission(
  p_module text,
  p_action text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.profile_roles pr
      join public.profiles prof on prof.id = pr.profile_id
      join public.roles r on r.id = pr.role_id
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions p on p.id = rp.permission_id
      where pr.profile_id = auth.uid()
        and pr.is_active
        and prof.is_active
        and r.is_active
        and p.module = p_module
        and p.action = p_action
    );
$$;

revoke all on function public.has_permission(text, text) from public, anon;
grant execute on function public.has_permission(text, text) to authenticated, service_role;

-- Fast profile-active check used by the Proxy, DAL and login action.
create or replace function public.is_profile_active()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;

revoke all on function public.is_profile_active() from public;
grant execute on function public.is_profile_active() to anon, authenticated, service_role;

-- Active role names for the signed-in user. Never returns roles for an inactive
-- profile or an inactive role assignment.
create or replace function public.get_my_active_role_names()
returns table (name text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select r.name
  from public.profile_roles pr
  join public.profiles p on p.id = pr.profile_id
  join public.roles r on r.id = pr.role_id
  where pr.profile_id = auth.uid()
    and pr.is_active
    and p.is_active
    and r.is_active;
$$;

revoke all on function public.get_my_active_role_names() from public, anon;
grant execute on function public.get_my_active_role_names() to authenticated, service_role;

-- Only Super Admins may change profile activation. Ordinary users keep column
-- privileges for their own non-security fields, but not for is_active.
create or replace function public.set_profile_active(
  p_profile_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
begin
  perform public.lock_super_admin_registry();

  if not public.is_super_admin() then
    raise exception 'Only a Super Admin can change profile activation.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_profile_id;

  if not found then
    raise exception 'Profile not found.'
      using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.set_profile_active(uuid, boolean) from public, anon;
grant execute on function public.set_profile_active(uuid, boolean) to authenticated, service_role;

-- Ordinary authenticated users may edit only safe profile columns. is_active
-- changes must go through public.set_profile_active().
revoke update on public.profiles from public, anon, authenticated;
grant update (full_name, phone, agency_name) on public.profiles to authenticated;

-- profiles: users can read their own row; staff with user-role view access and
-- Super Admins can read more.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or public.is_super_admin()
  or public.has_permission('users_roles', 'view')
);

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
on public.profiles for insert to authenticated
with check (
  auth.uid() = id
  or public.is_super_admin()
);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles for update to authenticated
using (
  auth.uid() = id
  or public.is_super_admin()
  or public.has_permission('users_roles', 'edit')
)
with check (
  auth.uid() = id
  or public.is_super_admin()
  or public.has_permission('users_roles', 'edit')
);

drop policy if exists "profiles_delete_super_admin_only" on public.profiles;
create policy "profiles_delete_super_admin_only"
on public.profiles for delete to authenticated
using (public.is_super_admin());

-- roles: readable by signed-in users; writable only by Super Admin.
drop policy if exists "roles_read_authenticated" on public.roles;
create policy "roles_read_authenticated"
on public.roles for select to authenticated
using (true);

drop policy if exists "roles_insert_super_admin_only" on public.roles;
create policy "roles_insert_super_admin_only"
on public.roles for insert to authenticated
with check (public.is_super_admin());

drop policy if exists "roles_update_super_admin_only" on public.roles;
create policy "roles_update_super_admin_only"
on public.roles for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "roles_delete_super_admin_only" on public.roles;
create policy "roles_delete_super_admin_only"
on public.roles for delete to authenticated
using (public.is_super_admin());

-- permissions: same pattern as roles.
drop policy if exists "permissions_read_authenticated" on public.permissions;
create policy "permissions_read_authenticated"
on public.permissions for select to authenticated
using (true);

drop policy if exists "permissions_insert_super_admin_only" on public.permissions;
create policy "permissions_insert_super_admin_only"
on public.permissions for insert to authenticated
with check (public.is_super_admin());

drop policy if exists "permissions_update_super_admin_only" on public.permissions;
create policy "permissions_update_super_admin_only"
on public.permissions for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "permissions_delete_super_admin_only" on public.permissions;
create policy "permissions_delete_super_admin_only"
on public.permissions for delete to authenticated
using (public.is_super_admin());

-- role_permissions: readable by signed-in users; writable only by Super Admin.
drop policy if exists "role_permissions_read_authenticated" on public.role_permissions;
create policy "role_permissions_read_authenticated"
on public.role_permissions for select to authenticated
using (true);

drop policy if exists "role_permissions_insert_super_admin_only" on public.role_permissions;
create policy "role_permissions_insert_super_admin_only"
on public.role_permissions for insert to authenticated
with check (public.is_super_admin());

drop policy if exists "role_permissions_update_super_admin_only" on public.role_permissions;
create policy "role_permissions_update_super_admin_only"
on public.role_permissions for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "role_permissions_delete_super_admin_only" on public.role_permissions;
create policy "role_permissions_delete_super_admin_only"
on public.role_permissions for delete to authenticated
using (public.is_super_admin());

-- profile_roles: users see their own assignments; only Super Admin can change
-- them. The one-time bootstrap exception lives in the protected trigger only,
-- not in these public-facing policies.
drop policy if exists "profile_roles_select_own_or_admin" on public.profile_roles;
create policy "profile_roles_select_own_or_admin"
on public.profile_roles for select to authenticated
using (
  auth.uid() = profile_id
  or public.is_super_admin()
  or public.has_permission('users_roles', 'view')
);

drop policy if exists "profile_roles_insert_super_admin_only" on public.profile_roles;
create policy "profile_roles_insert_super_admin_only"
on public.profile_roles for insert to authenticated
with check (public.is_super_admin());

drop policy if exists "profile_roles_update_super_admin_only" on public.profile_roles;
create policy "profile_roles_update_super_admin_only"
on public.profile_roles for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "profile_roles_delete_super_admin_only" on public.profile_roles;
create policy "profile_roles_delete_super_admin_only"
on public.profile_roles for delete to authenticated
using (public.is_super_admin());
