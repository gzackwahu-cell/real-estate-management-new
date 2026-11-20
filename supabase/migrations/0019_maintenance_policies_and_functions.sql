-- Stage 3 extension: maintenance RLS, atomic RPCs, audit and in-app notices.
-- Local migration only. Do not run manually until approved.
--
-- Maintenance tables grant SELECT only. Every write goes through a SECURITY
-- DEFINER RPC that checks permission, property assignment and business rules,
-- then writes an audit_log row. Notifications are in-app records only; no SMS,
-- email or WhatsApp provider is contacted.

alter table public.maintenance_requests enable row level security;
alter table public.maintenance_assignments enable row level security;
alter table public.maintenance_progress_updates enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists "maintenance_requests_select_scoped" on public.maintenance_requests;
create policy "maintenance_requests_select_scoped"
on public.maintenance_requests for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('maintenance', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_maintenance_request(id)
    )
  )
  or public.is_tenant_maintenance_request(id)
);

drop policy if exists "maintenance_assignments_select_scoped" on public.maintenance_assignments;
create policy "maintenance_assignments_select_scoped"
on public.maintenance_assignments for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('maintenance', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_maintenance_request(request_id)
    )
  )
  or public.is_tenant_maintenance_request(request_id)
);

drop policy if exists "maintenance_progress_select_scoped" on public.maintenance_progress_updates;
create policy "maintenance_progress_select_scoped"
on public.maintenance_progress_updates for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('maintenance', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_maintenance_request(request_id)
    )
  )
  or public.is_tenant_maintenance_request(request_id)
);

-- Expense data is staff/finance only. Tenants have no policy and no grant path.
drop policy if exists "expenses_select_scoped" on public.expenses;
create policy "expenses_select_scoped"
on public.expenses for select to authenticated
using (
  public.is_staff_member()
  and public.has_permission('expenses', 'view')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_property(property_id)
  )
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (recipient_profile_id = auth.uid());

-- No INSERT, UPDATE or DELETE policies exist on maintenance records.

-- ---------------------------------------------------------------------------
-- Notification helpers (prepared in-app records only)
-- ---------------------------------------------------------------------------

create or replace function public.create_maintenance_notification(
  p_recipient_profile_id uuid,
  p_event_type text,
  p_title text,
  p_message text,
  p_entity_id uuid default null,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification_id uuid;
begin
  if p_recipient_profile_id is null then
    return null;
  end if;

  insert into public.notifications (
    recipient_profile_id, event_type, title, message,
    entity_type, entity_id, link
  )
  values (
    p_recipient_profile_id, p_event_type, p_title, p_message,
    'maintenance_request', p_entity_id, p_link
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.notify_maintenance_staff(
  p_property_id uuid,
  p_request_id uuid,
  p_exclude_profile_id uuid,
  p_event_type text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in
    select distinct ps.profile_id
    from public.property_staff ps
    join public.profiles p on p.id = ps.profile_id
    where ps.property_id = p_property_id
      and ps.is_active
      and p.is_active
      and (p_exclude_profile_id is null or ps.profile_id <> p_exclude_profile_id)

    union

    select distinct pr.profile_id
    from public.profile_roles pr
    join public.profiles p on p.id = pr.profile_id
    join public.roles r on r.id = pr.role_id
    where pr.is_active
      and p.is_active
      and r.is_active
      and r.name in ('super_admin', 'admin')
      and (p_exclude_profile_id is null or pr.profile_id <> p_exclude_profile_id)
  loop
    perform public.create_maintenance_notification(
      v_profile_id,
      p_event_type,
      p_title,
      p_message,
      p_request_id,
      '/dashboard/maintenance/requests/' || p_request_id::text
    );
  end loop;
end;
$$;

revoke all on function public.create_maintenance_notification(uuid, text, text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.notify_maintenance_staff(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated;

-- Small presentation helper reused when composing staff notification text.
create or replace function public.maintenance_priority_label(p_priority text)
returns text
language sql
immutable
as $$
  select case p_priority
    when 'low' then 'Low'
    when 'normal' then 'Normal'
    when 'high' then 'High'
    when 'emergency' then 'Emergency'
    else coalesce(p_priority, '')
  end;
$$;

revoke all on function public.maintenance_priority_label(text) from public, anon, authenticated;
grant execute on function public.maintenance_priority_label(text) to service_role;

-- ---------------------------------------------------------------------------
-- Request creation
-- ---------------------------------------------------------------------------

create or replace function public.create_maintenance_request(
  p_property_id uuid,
  p_unit_id uuid,
  p_tenant_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_priority text,
  p_reported_date date,
  p_tenant_contact text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_property public.properties%rowtype;
  v_tenant public.tenants%rowtype;
  v_request_id uuid;
  v_contact text;
  v_is_staff boolean := public.is_staff_member();
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
begin
  if not public.has_permission('maintenance', 'create') then
    raise exception 'You do not have permission to report maintenance issues.'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_title) = 0 or length(v_description) = 0 then
    raise exception 'A title and description are required.'
      using errcode = 'check_violation';
  end if;

  if p_category is null or p_category not in (
    'plumbing', 'electrical', 'structural', 'cleaning', 'security',
    'appliances', 'painting', 'other'
  ) then
    raise exception 'Select a valid maintenance category.'
      using errcode = 'check_violation';
  end if;

  if p_priority is null or p_priority not in ('low', 'normal', 'high', 'emergency') then
    raise exception 'Select a valid priority.'
      using errcode = 'check_violation';
  end if;

  select * into v_property from public.properties where id = p_property_id;
  if not found then
    raise exception 'Property not found.'
      using errcode = 'no_data_found';
  end if;

  if v_is_staff then
    if not public.is_unscoped_staff()
       and not public.is_assigned_property(p_property_id) then
      raise exception 'You are not assigned to this property.'
        using errcode = 'insufficient_privilege';
    end if;
  else
    if p_tenant_id is null or not public.is_tenant_self(p_tenant_id) then
      raise exception 'You may only report maintenance for your own tenancy.'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.tenant_has_property(p_tenant_id, p_property_id) then
      raise exception 'You may only report maintenance for a property you rent.'
        using errcode = 'insufficient_privilege';
    end if;
    if p_unit_id is not null and not public.tenant_has_unit(p_tenant_id, p_unit_id) then
      raise exception 'You may only report maintenance for your own unit.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if p_tenant_id is not null then
    select * into v_tenant from public.tenants where id = p_tenant_id;
    if not found then
      raise exception 'Tenant not found.'
        using errcode = 'no_data_found';
    end if;

    -- Staff may register on behalf of a tenant, but the tenancy link still has
    -- to match the selected property and optional unit.
    if not public.tenant_has_property(p_tenant_id, p_property_id) then
      raise exception 'The tenant does not rent this property.'
        using errcode = 'check_violation';
    end if;
    if p_unit_id is not null and not public.tenant_has_unit(p_tenant_id, p_unit_id) then
      raise exception 'The tenant does not rent this unit.'
        using errcode = 'check_violation';
    end if;
  end if;

  v_contact := nullif(btrim(coalesce(p_tenant_contact, '')), '');
  if v_contact is null and v_tenant.id is not null then
    v_contact := nullif(btrim(coalesce(v_tenant.phone, '')), '');
    if v_contact is null then
      v_contact := nullif(btrim(coalesce(v_tenant.email, '')), '');
    end if;
  end if;

  insert into public.maintenance_requests (
    property_id, unit_id, tenant_id, reported_by_profile,
    title, description, category, priority, status, reported_date,
    tenant_contact, notes, created_by, updated_by
  )
  values (
    p_property_id, p_unit_id, p_tenant_id, auth.uid(),
    v_title, v_description, p_category, p_priority, 'submitted',
    coalesce(p_reported_date, current_date),
    v_contact, nullif(btrim(coalesce(p_notes, '')), ''), auth.uid(), auth.uid()
  )
  returning id into v_request_id;

  insert into public.maintenance_progress_updates (
    request_id, note, status_from, status_to, updated_by
  )
  values (
    v_request_id, 'Maintenance request submitted.', null, 'submitted', auth.uid()
  );

  if p_tenant_id is not null then
    perform public.create_maintenance_notification(
      (select profile_id from public.tenants where id = p_tenant_id),
      'maintenance_new',
      'Maintenance request received',
      'We received your report: ' || v_title || '.',
      v_request_id,
      '/tenant/maintenance'
    );
  end if;

  perform public.notify_maintenance_staff(
    p_property_id,
    v_request_id,
    auth.uid(),
    'maintenance_new',
    'New maintenance request: ' || v_title,
    v_property.title || ' · ' || public.maintenance_priority_label(p_priority)
  );

  perform public.log_financial_event(
    'maintenance_request',
    v_request_id,
    'create',
    'Maintenance request submitted.',
    jsonb_build_object(
      'property_id', p_property_id,
      'category', p_category,
      'priority', p_priority
    )
  );

  return v_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignment and work tracking
-- ---------------------------------------------------------------------------

-- Staff names cannot be read directly by all maintenance roles because profile
-- visibility is intentionally restricted. This helper exposes only the small
-- directory needed to choose an assignee and label audit history.
create or replace function public.list_maintenance_staff()
returns table (id uuid, full_name text, email text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select distinct p.id, p.full_name, p.email
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  where public.is_staff_member()
    and public.has_permission('maintenance', 'view')
    and p.is_active
    and pr.is_active
    and r.is_active
    and r.name in ('super_admin', 'admin', 'finance', 'property_manager',
                   'caretaker', 'field_agent')
  order by p.full_name, p.email;
$$;

revoke all on function public.list_maintenance_staff() from public, anon, authenticated;
grant execute on function public.list_maintenance_staff() to authenticated, service_role;

create or replace function public.assign_maintenance_request(
  p_request_id uuid,
  p_assigned_to uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.maintenance_requests%rowtype;
  v_action text;
  v_status_to text;
  v_note text;
begin
  if not public.is_staff_member()
     or not public.has_permission('maintenance', 'edit') then
    raise exception 'You do not have permission to assign maintenance requests.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Maintenance request not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_maintenance_request(p_request_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_request.status in ('completed', 'cancelled') then
    raise exception 'Completed or cancelled requests cannot be reassigned.'
      using errcode = 'check_violation';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  if p_assigned_to is null then
    v_action := 'unassigned';
    v_status_to := v_request.status;
    update public.maintenance_requests
    set assigned_to = null,
        assigned_at = null,
        updated_by = auth.uid()
    where id = p_request_id;
    v_note := coalesce(v_note, 'Assignment removed.');
  else
    if not public.is_assignable_staff(p_assigned_to) then
      raise exception 'Select an active authorized staff member.'
        using errcode = 'check_violation';
    end if;
    v_action := case when v_request.assigned_to is null then 'assigned' else 'reassigned' end;
    v_status_to := 'assigned';
    update public.maintenance_requests
    set assigned_to = p_assigned_to,
        assigned_at = now(),
        status = 'assigned',
        updated_by = auth.uid()
    where id = p_request_id;
    v_note := coalesce(v_note, 'Request assigned to a staff member.');
  end if;

  insert into public.maintenance_assignments (
    request_id, assigned_to, assigned_by, action, note
  )
  values (p_request_id, p_assigned_to, auth.uid(), v_action, v_note);

  insert into public.maintenance_progress_updates (
    request_id, note, status_from, status_to, updated_by
  )
  values (p_request_id, v_note, v_request.status, v_status_to, auth.uid());

  if p_assigned_to is not null then
    perform public.create_maintenance_notification(
      p_assigned_to,
      'maintenance_assigned',
      'Maintenance request assigned to you',
      v_note,
      p_request_id,
      '/dashboard/maintenance/requests/' || p_request_id::text
    );
  end if;

  if v_request.tenant_id is not null then
    perform public.create_maintenance_notification(
      (select profile_id from public.tenants where id = v_request.tenant_id),
      'maintenance_status',
      'Your maintenance request was updated',
      v_note,
      p_request_id,
      '/tenant/maintenance'
    );
  end if;

  perform public.log_financial_event(
    'maintenance_request',
    p_request_id,
    v_action,
    v_note,
    jsonb_build_object('assigned_to', p_assigned_to, 'status_to', v_status_to)
  );

  return p_request_id;
end;
$$;

create or replace function public.update_maintenance_status(
  p_request_id uuid,
  p_status text,
  p_note text default null,
  p_resolution text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.maintenance_requests%rowtype;
  v_note text;
  v_resolution text;
  v_event_type text;
begin
  if not public.is_staff_member()
     or not public.has_permission('maintenance', 'edit') then
    raise exception 'You do not have permission to update maintenance requests.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status is null or p_status not in (
    'submitted', 'acknowledged', 'assigned', 'in_progress',
    'awaiting_parts', 'completed', 'cancelled'
  ) then
    raise exception 'Select a valid maintenance status.'
      using errcode = 'check_violation';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Maintenance request not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_maintenance_request(p_request_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_request.status in ('completed', 'cancelled') then
    raise exception 'Completed or cancelled requests cannot be changed.'
      using errcode = 'check_violation';
  end if;

  if p_status = v_request.status then
    raise exception 'Select a different status.'
      using errcode = 'check_violation';
  end if;

  v_resolution := nullif(btrim(coalesce(p_resolution, '')), '');
  if p_status = 'completed' and v_resolution is null then
    raise exception 'A resolution is required when completing a request.'
      using errcode = 'check_violation';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is null then
    v_note := 'Status changed from ' || v_request.status || ' to ' || p_status || '.';
  end if;

  update public.maintenance_requests
  set status = p_status,
      resolution = case when p_status = 'completed' then v_resolution else resolution end,
      completed_at = case when p_status = 'completed' then now() else completed_at end,
      updated_by = auth.uid()
  where id = p_request_id;

  insert into public.maintenance_progress_updates (
    request_id, note, status_from, status_to, updated_by
  )
  values (p_request_id, v_note, v_request.status, p_status, auth.uid());

  v_event_type := case when p_status = 'completed'
    then 'maintenance_completed' else 'maintenance_status' end;

  if v_request.tenant_id is not null then
    perform public.create_maintenance_notification(
      (select profile_id from public.tenants where id = v_request.tenant_id),
      v_event_type,
      case when p_status = 'completed'
        then 'Your maintenance request was completed'
        else 'Your maintenance request was updated' end,
      case when p_status = 'completed' then v_resolution else v_note end,
      p_request_id,
      '/tenant/maintenance'
    );
  end if;

  if v_request.assigned_to is not null then
    perform public.create_maintenance_notification(
      v_request.assigned_to,
      v_event_type,
      'Maintenance request status changed',
      v_note,
      p_request_id,
      '/dashboard/maintenance/requests/' || p_request_id::text
    );
  end if;

  perform public.log_financial_event(
    'maintenance_request',
    p_request_id,
    'status_change',
    v_note,
    jsonb_build_object('status_from', v_request.status, 'status_to', p_status)
  );

  return p_request_id;
end;
$$;

create or replace function public.add_maintenance_note(
  p_request_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.maintenance_requests%rowtype;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_staff_member()
     or not public.has_permission('maintenance', 'edit') then
    raise exception 'You do not have permission to update maintenance requests.'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_note) = 0 then
    raise exception 'Enter a work note.'
      using errcode = 'check_violation';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Maintenance request not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_maintenance_request(p_request_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.maintenance_progress_updates (
    request_id, note, status_from, status_to, updated_by
  )
  values (p_request_id, v_note, null, null, auth.uid());

  update public.maintenance_requests
  set updated_by = auth.uid()
  where id = p_request_id;

  if v_request.tenant_id is not null then
    perform public.create_maintenance_notification(
      (select profile_id from public.tenants where id = v_request.tenant_id),
      'maintenance_status',
      'New update on your maintenance request',
      v_note,
      p_request_id,
      '/tenant/maintenance'
    );
  end if;

  perform public.log_financial_event(
    'maintenance_request',
    p_request_id,
    'note',
    v_note,
    '{}'::jsonb
  );

  return p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Maintenance expenses (finance/admin only)
-- ---------------------------------------------------------------------------

create or replace function public.record_maintenance_expense(
  p_property_id uuid,
  p_maintenance_request_id uuid,
  p_category text,
  p_vendor text,
  p_description text,
  p_amount numeric,
  p_payment_status text,
  p_expense_date date,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense_id uuid;
  v_description text := btrim(coalesce(p_description, ''));
begin
  if not public.is_staff_member()
     or not public.has_permission('expenses', 'create') then
    raise exception 'You do not have permission to record maintenance expenses.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_property(p_property_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_description) = 0 then
    raise exception 'Enter an expense description.'
      using errcode = 'check_violation';
  end if;

  if p_category is null or p_category not in ('materials', 'labour', 'other') then
    raise exception 'Select a valid expense category.'
      using errcode = 'check_violation';
  end if;

  if p_payment_status is null or p_payment_status not in ('unpaid', 'partial', 'paid') then
    raise exception 'Select a valid payment status.'
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Expense amount must be greater than zero.'
      using errcode = 'check_violation';
  end if;

  insert into public.expenses (
    property_id, maintenance_request_id, category, vendor, description,
    amount, payment_status, expense_date, reference, created_by, updated_by
  )
  values (
    p_property_id, p_maintenance_request_id, p_category,
    nullif(btrim(coalesce(p_vendor, '')), ''),
    v_description, p_amount, p_payment_status,
    coalesce(p_expense_date, current_date),
    nullif(btrim(coalesce(p_reference, '')), ''),
    auth.uid(), auth.uid()
  )
  returning id into v_expense_id;

  perform public.log_financial_event(
    'expense',
    v_expense_id,
    'record',
    'Maintenance expense recorded.',
    jsonb_build_object(
      'property_id', p_property_id,
      'maintenance_request_id', p_maintenance_request_id,
      'amount', p_amount,
      'payment_status', p_payment_status
    )
  );

  return v_expense_id;
end;
$$;

create or replace function public.update_maintenance_expense(
  p_expense_id uuid,
  p_property_id uuid,
  p_maintenance_request_id uuid,
  p_category text,
  p_vendor text,
  p_description text,
  p_amount numeric,
  p_payment_status text,
  p_expense_date date,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense public.expenses%rowtype;
  v_description text := btrim(coalesce(p_description, ''));
begin
  if not public.is_staff_member()
     or not public.has_permission('expenses', 'edit') then
    raise exception 'You do not have permission to edit maintenance expenses.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id
  for update;

  if not found then
    raise exception 'Expense record not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_property(v_expense.property_id)
     and not public.is_assigned_property(p_property_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_description) = 0 then
    raise exception 'Enter an expense description.'
      using errcode = 'check_violation';
  end if;

  if p_category is null or p_category not in ('materials', 'labour', 'other') then
    raise exception 'Select a valid expense category.'
      using errcode = 'check_violation';
  end if;

  if p_payment_status is null or p_payment_status not in ('unpaid', 'partial', 'paid') then
    raise exception 'Select a valid payment status.'
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Expense amount must be greater than zero.'
      using errcode = 'check_violation';
  end if;

  update public.expenses
  set property_id = p_property_id,
      maintenance_request_id = p_maintenance_request_id,
      category = p_category,
      vendor = nullif(btrim(coalesce(p_vendor, '')), ''),
      description = v_description,
      amount = p_amount,
      payment_status = p_payment_status,
      expense_date = coalesce(p_expense_date, current_date),
      reference = nullif(btrim(coalesce(p_reference, '')), ''),
      updated_by = auth.uid()
  where id = p_expense_id;

  perform public.log_financial_event(
    'expense',
    p_expense_id,
    'edit',
    'Maintenance expense updated.',
    jsonb_build_object('amount', p_amount, 'payment_status', p_payment_status)
  );

  return p_expense_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.create_maintenance_request(uuid, uuid, uuid, text, text, text, text, date, text, text)
  from public, anon;
revoke all on function public.assign_maintenance_request(uuid, uuid, text) from public, anon;
revoke all on function public.update_maintenance_status(uuid, text, text, text) from public, anon;
revoke all on function public.add_maintenance_note(uuid, text) from public, anon;
revoke all on function public.record_maintenance_expense(uuid, uuid, text, text, text, numeric, text, date, text)
  from public, anon;
revoke all on function public.update_maintenance_expense(uuid, uuid, uuid, text, text, text, numeric, text, date, text)
  from public, anon;

grant execute on function public.create_maintenance_request(uuid, uuid, uuid, text, text, text, text, date, text, text)
  to authenticated, service_role;
grant execute on function public.assign_maintenance_request(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.update_maintenance_status(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.add_maintenance_note(uuid, text) to authenticated, service_role;
grant execute on function public.record_maintenance_expense(uuid, uuid, text, text, text, numeric, text, date, text)
  to authenticated, service_role;
grant execute on function public.update_maintenance_expense(uuid, uuid, uuid, text, text, text, numeric, text, date, text)
  to authenticated, service_role;
