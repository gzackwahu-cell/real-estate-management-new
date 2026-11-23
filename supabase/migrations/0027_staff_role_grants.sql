-- Narrow write grants for Super Admin-managed role assignment tables.
-- RLS policies already restrict these operations to has_permission('users_roles','edit')
-- and Super Admin checks in application actions/RPCs. The missing table grants
-- caused role/permission mutations to fail despite passing RLS.

grant insert, update, delete on public.roles to authenticated;
grant insert, update, delete on public.permissions to authenticated;
grant insert, update, delete on public.role_permissions to authenticated;
grant insert, update, delete on public.profile_roles to authenticated;
