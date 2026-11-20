-- Stage 3 extension: additive maintenance role grants.
-- Local migration only. Do not run manually until approved.
--
-- The starter grants in 0007 predate the maintenance workflow. These additions
-- let the roles named in the workflow actually use it without changing any
-- existing grant. Finance receives maintenance:view so expense staff can link
-- a cost to a valid request; expense recording/editing stays on the expenses
-- module and remains finance/admin-only. Finance also receives read-only
-- property/unit access for linking costs. Caretakers and field agents receive
-- tenants:view so they can select the tenant a request is reported for; tenant
-- RLS still limits them to assigned properties.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where (
    r.name = 'caretaker'
    and p.module = 'maintenance'
    and p.action = 'create'
  )
  or (
    r.name = 'field_agent'
    and p.module = 'maintenance'
    and p.action in ('view', 'create', 'edit')
  )
  or (
    r.name = 'finance'
    and p.module = 'maintenance'
    and p.action = 'view'
  )
  or (
    r.name = 'finance'
    and p.module in ('properties', 'units')
    and p.action = 'view'
  )
  or (
    r.name in ('caretaker', 'field_agent')
    and p.module = 'tenants'
    and p.action = 'view'
  )
on conflict do nothing;
