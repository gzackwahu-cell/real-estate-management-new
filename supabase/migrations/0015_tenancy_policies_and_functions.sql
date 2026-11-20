-- Stage 1 extension: tenancy RLS policies and transactional mutation RPCs.
-- Local migration only. Do not run manually until approved.
--
-- Tenant records are private. Staff must hold both the module permission and an
-- active assignment to the related property unless they are unscoped staff
-- (Super Admin, Admin, Finance). Tenants can only read rows linked to their own
-- profile through a lease.

alter table public.tenants enable row level security;
alter table public.rental_applications enable row level security;
alter table public.leases enable row level security;

-- One approved application can produce at most one lease. Renewals use
-- leases.renewal_of instead, so they do not need a second source application.
create unique index if not exists leases_source_application_key
on public.leases (source_application_id)
where source_application_id is not null;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

drop policy if exists "tenants_select_scoped" on public.tenants;
create policy "tenants_select_scoped"
on public.tenants for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('tenants', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_tenant(id)
    )
  )
  or public.is_tenant_self(id)
);

drop policy if exists "tenants_insert_staff" on public.tenants;
create policy "tenants_insert_staff"
on public.tenants for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('tenants', 'create')
);

drop policy if exists "tenants_update_scoped_staff" on public.tenants;
create policy "tenants_update_scoped_staff"
on public.tenants for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('tenants', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_tenant(id)
  )
)
with check (
  public.is_staff_member()
  and public.has_permission('tenants', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_tenant(id)
  )
);

-- Tenant records are retained for lease history. Use status = 'archived'
-- instead of deleting a record. No DELETE policy is granted.

-- ---------------------------------------------------------------------------
-- Rental applications
-- ---------------------------------------------------------------------------

drop policy if exists "rental_applications_select_scoped" on public.rental_applications;
create policy "rental_applications_select_scoped"
on public.rental_applications for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('tenants', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_unit(unit_id)
    )
  )
  or (
    tenant_id is not null
    and public.is_tenant_self(tenant_id)
  )
);

drop policy if exists "rental_applications_insert_scoped_staff" on public.rental_applications;
create policy "rental_applications_insert_scoped_staff"
on public.rental_applications for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('tenants', 'create')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_unit(unit_id)
  )
);

drop policy if exists "rental_applications_update_scoped_staff" on public.rental_applications;
create policy "rental_applications_update_scoped_staff"
on public.rental_applications for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('tenants', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_unit(unit_id)
  )
)
with check (
  public.is_staff_member()
  and public.has_permission('tenants', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_unit(unit_id)
  )
);

-- Decisions are written by the SECURITY DEFINER review RPC below after an
-- explicit 'tenants' + 'approve' permission check. Direct updates still need
-- 'tenants' + 'edit'. No DELETE policy is granted.

-- ---------------------------------------------------------------------------
-- Leases
-- ---------------------------------------------------------------------------

drop policy if exists "leases_select_scoped" on public.leases;
create policy "leases_select_scoped"
on public.leases for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('leases', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_lease(id)
    )
  )
  or public.is_tenant_lease(id)
);

drop policy if exists "leases_insert_scoped_staff" on public.leases;
create policy "leases_insert_scoped_staff"
on public.leases for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('leases', 'create')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_unit(unit_id)
  )
);

drop policy if exists "leases_update_scoped_staff" on public.leases;
create policy "leases_update_scoped_staff"
on public.leases for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('leases', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_lease(id)
  )
)
with check (
  public.is_staff_member()
  and public.has_permission('leases', 'edit')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_lease(id)
  )
);

-- Lease history is retained. Use status = 'terminated' with a reason instead
-- of deleting a record. No DELETE policy is granted.

-- ---------------------------------------------------------------------------
-- Additive tenant self-access on portfolio tables
-- ---------------------------------------------------------------------------

-- Existing staff/owner/assignment policies in 0013 remain unchanged. These
-- policies only let an authenticated tenant read the unit and property named
-- in their own lease records, which the tenant portal needs to display.

drop policy if exists "units_select_tenant_self" on public.units;
create policy "units_select_tenant_self"
on public.units for select to authenticated
using (public.is_tenant_unit(id));

drop policy if exists "properties_select_tenant_self" on public.properties;
create policy "properties_select_tenant_self"
on public.properties for select to authenticated
using (public.is_tenant_property(id));

-- ---------------------------------------------------------------------------
-- Application review: approve/reject without creating a lease
-- ---------------------------------------------------------------------------

create or replace function public.review_rental_application(
  p_application_id uuid,
  p_status text,
  p_decision_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_application public.rental_applications%rowtype;
  v_tenant_id uuid;
begin
  if not public.is_staff_member()
     or not public.has_permission('tenants', 'approve') then
    raise exception 'You do not have permission to review rental applications.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('under_review', 'approved', 'rejected', 'withdrawn') then
    raise exception 'Invalid application decision.'
      using errcode = 'check_violation';
  end if;

  if p_status in ('approved', 'rejected')
     and (p_decision_notes is null or length(btrim(p_decision_notes)) = 0) then
    raise exception 'A decision note is required for approved or rejected applications.'
      using errcode = 'check_violation';
  end if;

  select *
  into v_application
  from public.rental_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Rental application not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_unit(v_application.unit_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_application.status in ('approved', 'rejected', 'withdrawn') then
    raise exception 'This application is already closed.'
      using errcode = 'check_violation';
  end if;

  v_tenant_id := v_application.tenant_id;

  -- Blueprint workflow: approval creates or links the tenant record only.
  -- Lease creation is always a separate, explicit next step.
  if p_status = 'approved' and v_tenant_id is null then
    select id
    into v_tenant_id
    from public.tenants
    where lower(btrim(id_reference)) = lower(btrim(v_application.applicant_id_reference))
    limit 1;

    if v_tenant_id is null then
      begin
        insert into public.tenants (
          full_name,
          phone,
          email,
          id_reference,
          address,
          status,
          created_by,
          updated_by
        )
        values (
          btrim(v_application.applicant_full_name),
          btrim(v_application.applicant_phone),
          nullif(btrim(coalesce(v_application.applicant_email, '')), ''),
          btrim(v_application.applicant_id_reference),
          coalesce(nullif(btrim(coalesce(v_application.applicant_address, '')), ''), 'Address not provided'),
          'active',
          auth.uid(),
          auth.uid()
        )
        returning id into v_tenant_id;
      exception
        when unique_violation then
          select id
          into v_tenant_id
          from public.tenants
          where lower(btrim(id_reference)) = lower(btrim(v_application.applicant_id_reference))
          limit 1;

          if v_tenant_id is null then
            raise exception 'The applicant could not be linked to a tenant record.'
              using errcode = 'check_violation';
          end if;
      end;
    end if;
  end if;

  update public.rental_applications
  set status = p_status,
      decision_notes = nullif(btrim(coalesce(p_decision_notes, '')), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      tenant_id = coalesce(v_tenant_id, tenant_id),
      updated_by = auth.uid()
  where id = p_application_id;

  return p_application_id;
end;
$$;

revoke all on function public.review_rental_application(uuid, text, text) from public, anon;
grant execute on function public.review_rental_application(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Lease create/update with server-side workflow checks
-- ---------------------------------------------------------------------------

create or replace function public.create_lease(
  p_tenant_id uuid,
  p_unit_id uuid,
  p_start_date date,
  p_end_date date,
  p_monthly_rent numeric,
  p_security_deposit_required boolean,
  p_rent_due_day integer,
  p_status text,
  p_special_terms text,
  p_notes text,
  p_source_application_id uuid default null,
  p_renewal_of uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lease_id uuid;
  v_tenant_status text;
  v_unit_active boolean;
  v_application public.rental_applications%rowtype;
  v_source_lease public.leases%rowtype;
begin
  if not public.is_staff_member()
     or not public.has_permission('leases', 'create') then
    raise exception 'You do not have permission to create a lease.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status = 'terminated' then
    raise exception 'Record termination details when editing an existing lease.'
      using errcode = 'check_violation';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_unit(p_unit_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('draft', 'pending', 'active', 'expired', 'terminated') then
    raise exception 'Invalid lease status.'
      using errcode = 'check_violation';
  end if;

  if p_end_date <= p_start_date then
    raise exception 'The end date must be after the start date.'
      using errcode = 'check_violation';
  end if;

  if p_monthly_rent < 0 then
    raise exception 'Monthly rent cannot be negative.'
      using errcode = 'check_violation';
  end if;

  if p_rent_due_day is null or p_rent_due_day not between 1 and 28 then
    raise exception 'Rent due day must be between 1 and 28.'
      using errcode = 'check_violation';
  end if;

  select status
  into v_tenant_status
  from public.tenants
  where id = p_tenant_id;

  if not found then
    raise exception 'Tenant not found.'
      using errcode = 'no_data_found';
  end if;

  if v_tenant_status <> 'active' then
    raise exception 'Only active tenants can be linked to a new lease.'
      using errcode = 'check_violation';
  end if;

  select is_active
  into v_unit_active
  from public.units
  where id = p_unit_id;

  if not found then
    raise exception 'Unit not found.'
      using errcode = 'no_data_found';
  end if;

  if not v_unit_active then
    raise exception 'The selected unit is inactive.'
      using errcode = 'check_violation';
  end if;

  if p_source_application_id is not null then
    select *
    into v_application
    from public.rental_applications
    where id = p_source_application_id;

    if not found
       or v_application.status <> 'approved'
       or v_application.tenant_id is distinct from p_tenant_id
       or v_application.unit_id is distinct from p_unit_id then
      raise exception 'The source application must be approved and match this tenant and unit.'
        using errcode = 'check_violation';
    end if;
  end if;

  if p_renewal_of is not null then
    select *
    into v_source_lease
    from public.leases
    where id = p_renewal_of;

    if not found
       or v_source_lease.tenant_id is distinct from p_tenant_id
       or v_source_lease.unit_id is distinct from p_unit_id
       or v_source_lease.status not in ('active', 'expired') then
      raise exception 'The lease being renewed must belong to the same active tenancy.'
        using errcode = 'check_violation';
    end if;

    if p_start_date <= v_source_lease.end_date then
      raise exception 'A renewal must start after the current lease ends.'
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.leases (
    tenant_id,
    unit_id,
    source_application_id,
    start_date,
    end_date,
    monthly_rent,
    security_deposit_required,
    rent_due_day,
    status,
    special_terms,
    notes,
    renewal_of,
    created_by,
    updated_by
  )
  values (
    p_tenant_id,
    p_unit_id,
    p_source_application_id,
    p_start_date,
    p_end_date,
    p_monthly_rent,
    p_security_deposit_required,
    p_rent_due_day,
    p_status,
    nullif(btrim(coalesce(p_special_terms, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_renewal_of,
    auth.uid(),
    auth.uid()
  )
  returning id into v_lease_id;

  return v_lease_id;
end;
$$;

create or replace function public.update_lease(
  p_lease_id uuid,
  p_tenant_id uuid,
  p_unit_id uuid,
  p_start_date date,
  p_end_date date,
  p_monthly_rent numeric,
  p_security_deposit_required boolean,
  p_rent_due_day integer,
  p_status text,
  p_special_terms text,
  p_notes text,
  p_terminated_on date,
  p_termination_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.leases%rowtype;
  v_tenant_status text;
  v_unit_active boolean;
begin
  if not public.is_staff_member()
     or not public.has_permission('leases', 'edit') then
    raise exception 'You do not have permission to edit this lease.'
      using errcode = 'insufficient_privilege';
  end if;

  select *
  into v_current
  from public.leases
  where id = p_lease_id
  for update;

  if not found then
    raise exception 'Lease not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not (
       public.is_assigned_lease(p_lease_id)
       and (
         p_unit_id = v_current.unit_id
         or public.is_assigned_unit(p_unit_id)
       )
     ) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('draft', 'pending', 'active', 'expired', 'terminated') then
    raise exception 'Invalid lease status.'
      using errcode = 'check_violation';
  end if;

  if p_end_date <= p_start_date then
    raise exception 'The end date must be after the start date.'
      using errcode = 'check_violation';
  end if;

  if p_monthly_rent < 0 then
    raise exception 'Monthly rent cannot be negative.'
      using errcode = 'check_violation';
  end if;

  if p_rent_due_day is null or p_rent_due_day not between 1 and 28 then
    raise exception 'Rent due day must be between 1 and 28.'
      using errcode = 'check_violation';
  end if;

  if p_status = 'terminated' then
    if p_terminated_on is null
       or p_termination_reason is null
       or length(btrim(p_termination_reason)) = 0 then
      raise exception 'Terminated leases require a termination date and reason.'
        using errcode = 'check_violation';
    end if;
  elsif p_terminated_on is not null or p_termination_reason is not null then
    raise exception 'Termination details are only valid for terminated leases.'
      using errcode = 'check_violation';
  end if;

  if p_tenant_id is distinct from v_current.tenant_id then
    select status
    into v_tenant_status
    from public.tenants
    where id = p_tenant_id;

    if not found then
      raise exception 'Tenant not found.'
        using errcode = 'no_data_found';
    end if;

    if v_tenant_status <> 'active' then
      raise exception 'Only active tenants can be linked to a new lease.'
        using errcode = 'check_violation';
    end if;
  end if;

  if p_unit_id is distinct from v_current.unit_id then
    select is_active
    into v_unit_active
    from public.units
    where id = p_unit_id;

    if not found then
      raise exception 'Unit not found.'
        using errcode = 'no_data_found';
    end if;

    if not v_unit_active then
      raise exception 'The selected unit is inactive.'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.leases
  set tenant_id = p_tenant_id,
      unit_id = p_unit_id,
      start_date = p_start_date,
      end_date = p_end_date,
      monthly_rent = p_monthly_rent,
      security_deposit_required = p_security_deposit_required,
      rent_due_day = p_rent_due_day,
      status = p_status,
      special_terms = nullif(btrim(coalesce(p_special_terms, '')), ''),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      terminated_on = p_terminated_on,
      termination_reason = nullif(btrim(coalesce(p_termination_reason, '')), ''),
      updated_by = auth.uid()
  where id = p_lease_id;

  return p_lease_id;
end;
$$;

revoke all on function public.create_lease(uuid, uuid, date, date, numeric, boolean, integer, text, text, text, uuid, uuid) from public, anon;
revoke all on function public.update_lease(uuid, uuid, uuid, date, date, numeric, boolean, integer, text, text, text, date, text) from public, anon;

grant execute on function public.create_lease(uuid, uuid, date, date, numeric, boolean, integer, text, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.update_lease(uuid, uuid, uuid, date, date, numeric, boolean, integer, text, text, text, date, text) to authenticated, service_role;
