-- Stage 3 extension: maintenance and repairs foundation.
-- Local migration only. Do not run manually until approved.
--
-- Follows the approved blueprint maintenance and communication tables.
-- Financial expense records are kept in their own ledger and are never linked
-- to rent payments, tenants or tenant balances. All money columns are
-- numeric(12, 2). RLS and mutation RPCs live in 0019.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Maintenance requests
-- ---------------------------------------------------------------------------

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  reported_by_profile uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  priority text not null default 'normal',
  status text not null default 'submitted',
  reported_date date not null default current_date,
  tenant_contact text,
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  completed_at timestamptz,
  resolution text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_requests_title_not_blank check (length(btrim(title)) > 0),
  constraint maintenance_requests_description_not_blank check (length(btrim(description)) > 0),
  constraint maintenance_requests_category_check check (
    category in ('plumbing', 'electrical', 'structural', 'cleaning', 'security',
                 'appliances', 'painting', 'other')
  ),
  constraint maintenance_requests_priority_check check (
    priority in ('low', 'normal', 'high', 'emergency')
  ),
  constraint maintenance_requests_status_check check (
    status in ('submitted', 'acknowledged', 'assigned', 'in_progress',
               'awaiting_parts', 'completed', 'cancelled')
  )
);

create index if not exists maintenance_requests_property_idx
  on public.maintenance_requests (property_id);
create index if not exists maintenance_requests_unit_idx
  on public.maintenance_requests (unit_id);
create index if not exists maintenance_requests_tenant_idx
  on public.maintenance_requests (tenant_id);
create index if not exists maintenance_requests_status_idx
  on public.maintenance_requests (status);
create index if not exists maintenance_requests_priority_idx
  on public.maintenance_requests (priority);
create index if not exists maintenance_requests_assigned_idx
  on public.maintenance_requests (assigned_to);
create index if not exists maintenance_requests_reported_idx
  on public.maintenance_requests (reported_date desc);

drop trigger if exists maintenance_requests_set_updated_at on public.maintenance_requests;
create trigger maintenance_requests_set_updated_at
before update on public.maintenance_requests
for each row execute function public.set_updated_at();

-- A unit may only be attached to a request for its own property.
create or replace function public.validate_maintenance_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unit_property uuid;
begin
  if new.unit_id is not null then
    select property_id into v_unit_property from public.units where id = new.unit_id;
    if not found or v_unit_property is distinct from new.property_id then
      raise exception 'The selected unit does not belong to this property.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_maintenance_request_scope on public.maintenance_requests;
create trigger validate_maintenance_request_scope
before insert or update of property_id, unit_id on public.maintenance_requests
for each row execute function public.validate_maintenance_request_scope();

-- ---------------------------------------------------------------------------
-- Assignment history
-- ---------------------------------------------------------------------------

create table if not exists public.maintenance_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint maintenance_assignments_action_check check (
    action in ('assigned', 'reassigned', 'unassigned')
  )
);

create index if not exists maintenance_assignments_request_idx
  on public.maintenance_assignments (request_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Work notes and status-change history
-- ---------------------------------------------------------------------------

create table if not exists public.maintenance_progress_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  note text not null,
  status_from text,
  status_to text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint maintenance_progress_note_not_blank check (length(btrim(note)) > 0)
);

create index if not exists maintenance_progress_request_idx
  on public.maintenance_progress_updates (request_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Maintenance expenses (separate from rent and tenant balances)
-- ---------------------------------------------------------------------------

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  category text not null,
  vendor text,
  description text not null,
  amount numeric(12, 2) not null,
  payment_status text not null default 'unpaid',
  expense_date date not null default current_date,
  reference text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_description_not_blank check (length(btrim(description)) > 0),
  constraint expenses_amount_check check (amount > 0),
  constraint expenses_category_check check (category in ('materials', 'labour', 'other')),
  constraint expenses_payment_status_check check (
    payment_status in ('unpaid', 'partial', 'paid')
  )
);

create index if not exists expenses_property_idx on public.expenses (property_id);
create index if not exists expenses_request_idx on public.expenses (maintenance_request_id);
create index if not exists expenses_date_idx on public.expenses (expense_date desc);
create index if not exists expenses_payment_status_idx on public.expenses (payment_status);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- An expense linked to a request must belong to that request's property.
create or replace function public.validate_expense_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_property uuid;
begin
  if new.maintenance_request_id is not null then
    select property_id into v_request_property
    from public.maintenance_requests
    where id = new.maintenance_request_id;

    if not found or v_request_property is distinct from new.property_id then
      raise exception 'The selected request does not belong to this property.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_expense_request_scope on public.expenses;
create trigger validate_expense_request_scope
before insert or update of property_id, maintenance_request_id on public.expenses
for each row execute function public.validate_expense_request_scope();

-- ---------------------------------------------------------------------------
-- In-app notifications (prepared only; no external delivery)
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  message text not null,
  channel text not null default 'in_app',
  status text not null default 'unread',
  entity_type text,
  entity_id uuid,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_event_type_check check (
    event_type in ('maintenance_new', 'maintenance_assigned',
                   'maintenance_status', 'maintenance_completed')
  ),
  constraint notifications_channel_check check (channel = 'in_app'),
  constraint notifications_status_check check (status in ('unread', 'read')),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_message_not_blank check (length(btrim(message)) > 0)
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_profile_id, created_at desc);
create index if not exists notifications_status_idx
  on public.notifications (recipient_profile_id, status);

-- ---------------------------------------------------------------------------
-- Scoped-access helpers used by RLS and RPCs
-- ---------------------------------------------------------------------------

create or replace function public.is_tenant_maintenance_request(p_request_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.maintenance_requests r
    join public.tenants t on t.id = r.tenant_id
    where r.id = p_request_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_assigned_maintenance_request(p_request_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.maintenance_requests r
    where r.id = p_request_id
      and (
        r.assigned_to = auth.uid()
        or exists (
          select 1
          from public.property_staff ps
          where ps.property_id = r.property_id
            and ps.profile_id = auth.uid()
            and ps.is_active
        )
      )
  );
$$;

create or replace function public.tenant_has_property(p_tenant_id uuid, p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.leases l
    join public.units u on u.id = l.unit_id
    where l.tenant_id = p_tenant_id
      and u.property_id = p_property_id
  );
$$;

create or replace function public.tenant_has_unit(p_tenant_id uuid, p_unit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.leases l
    where l.tenant_id = p_tenant_id
      and l.unit_id = p_unit_id
  );
$$;

create or replace function public.is_assignable_staff(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_roles pr on pr.profile_id = p.id
    join public.roles r on r.id = pr.role_id
    where p.id = p_profile_id
      and p.is_active
      and pr.is_active
      and r.is_active
      and r.name in ('super_admin', 'admin', 'finance', 'property_manager',
                     'caretaker', 'field_agent')
  );
$$;

revoke all on function public.validate_maintenance_request_scope() from public, anon, authenticated;
revoke all on function public.validate_expense_request_scope() from public, anon, authenticated;

revoke all on function public.is_tenant_maintenance_request(uuid) from public, anon;
revoke all on function public.is_assigned_maintenance_request(uuid) from public, anon;
revoke all on function public.tenant_has_property(uuid, uuid) from public, anon;
revoke all on function public.tenant_has_unit(uuid, uuid) from public, anon;
revoke all on function public.is_assignable_staff(uuid) from public, anon;
grant execute on function public.is_tenant_maintenance_request(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_maintenance_request(uuid) to authenticated, service_role;
grant execute on function public.tenant_has_property(uuid, uuid) to authenticated, service_role;
grant execute on function public.tenant_has_unit(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_assignable_staff(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. INSERT/UPDATE/DELETE go through audited RPCs in 0019.
-- ---------------------------------------------------------------------------

revoke all on public.maintenance_requests from public, anon, authenticated;
grant select on public.maintenance_requests to authenticated;
grant all on public.maintenance_requests to service_role;

revoke all on public.maintenance_assignments from public, anon, authenticated;
grant select on public.maintenance_assignments to authenticated;
grant all on public.maintenance_assignments to service_role;

revoke all on public.maintenance_progress_updates from public, anon, authenticated;
grant select on public.maintenance_progress_updates to authenticated;
grant all on public.maintenance_progress_updates to service_role;

revoke all on public.expenses from public, anon, authenticated;
grant select on public.expenses to authenticated;
grant all on public.expenses to service_role;

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
