-- Stage 1: built-in roles, permissions and starter grants.
-- Local migration only. Do not run manually until approved.

insert into public.roles (name, description, is_system, is_active)
values
  ('super_admin', 'Full unrestricted access to every module.', true, true),
  ('admin', 'Day-to-day administration with configurable access.', true, true),
  ('finance', 'Charges, payments, deposits, expenses and reports.', true, true),
  ('property_manager', 'Assigned properties, units, leases and maintenance.', true, true),
  ('caretaker', 'Assigned buildings, unit status and maintenance.', true, true),
  ('field_agent', 'Listings, buyers, inquiries and viewings.', true, true),
  ('tenant', 'Limited access to own tenancy data and maintenance.', true, true),
  ('owner', 'Limited access to owned properties and statements.', true, true)
on conflict (name) do update
set description = excluded.description,
    is_system = true,
    is_active = true;

with module_names (name) as (
  select unnest(array[
    'properties', 'units', 'owners', 'tenants', 'leases', 'rent',
    'payments', 'deposits', 'expenses', 'maintenance', 'listings',
    'inquiries', 'viewings', 'website_content', 'users_roles',
    'reports', 'settings', 'notifications'
  ])
),
action_names (name) as (
  select unnest(array[
    'view', 'create', 'edit', 'delete', 'approve', 'export', 'publish'
  ])
)
insert into public.permissions (module, action, description)
select
  m.name,
  a.name,
  m.name || ':' || a.name
from module_names m
cross join action_names a
on conflict (module, action) do nothing;

-- Super Admin receives every permission.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

-- Admin receives broad operational access but cannot manage users and roles.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin'
  and not (
    p.module = 'users_roles'
    and p.action in ('create', 'edit', 'delete', 'approve', 'publish')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'finance'
  and (
    (p.module in ('payments', 'deposits', 'rent', 'expenses', 'reports')
      and p.action in ('view', 'create', 'edit', 'approve', 'export'))
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'property_manager'
  and (
    (p.module in ('properties', 'units', 'owners', 'tenants', 'leases', 'maintenance', 'listings')
      and p.action in ('view', 'create', 'edit', 'publish'))
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'caretaker'
  and (
    (p.module in ('properties', 'units', 'maintenance')
      and p.action in ('view', 'edit'))
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'field_agent'
  and (
    (p.module in ('listings', 'inquiries', 'viewings')
      and p.action in ('view', 'create', 'edit', 'publish'))
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'tenant'
  and (
    (p.module = 'maintenance' and p.action in ('view', 'create'))
    or (p.module in ('rent', 'payments') and p.action = 'view')
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'owner'
  and (
    (p.module in ('properties', 'units', 'reports', 'payments') and p.action = 'view')
    or (p.module = 'notifications' and p.action = 'view')
  )
on conflict do nothing;
