-- Stage 3 extension: owner portal scoped reads.
-- Local migration only. Do not run manually until approved.
--
-- Owners are not staff members. Existing RLS already limits properties, units
-- and property attachments to verified ownership through is_property_owner().
-- This migration extends that same boundary to maintenance progress and adds
-- curated, read-only helpers for tenant/lease overview and financial summaries.
-- No new tables are created and no finance write path is changed.

-- ---------------------------------------------------------------------------
-- Maintenance scope helper
-- ---------------------------------------------------------------------------

create or replace function public.is_owner_maintenance_request(p_request_id uuid)
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
      and public.is_property_owner(r.property_id)
  );
$$;

revoke all on function public.is_owner_maintenance_request(uuid) from public, anon;
grant execute on function public.is_owner_maintenance_request(uuid) to authenticated, service_role;

-- Owners may read requests and their progress, but never expense records.
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
  or public.is_owner_maintenance_request(id)
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
  or public.is_owner_maintenance_request(request_id)
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
  or public.is_owner_maintenance_request(request_id)
);

-- ---------------------------------------------------------------------------
-- Curated tenant / lease overview
-- ---------------------------------------------------------------------------
-- Owners receive only the fields needed for a property overview. Identity
-- references, addresses, emergency contacts and full account histories are
-- deliberately excluded.

create or replace function public.owner_tenant_overview(p_property_id uuid default null)
returns table (
  property_id uuid,
  property_title text,
  unit_id uuid,
  unit_number text,
  tenant_id uuid,
  tenant_name text,
  tenant_phone text,
  lease_id uuid,
  lease_status text,
  start_date date,
  end_date date,
  monthly_rent numeric,
  rent_due_day integer
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if p_property_id is not null and not public.is_property_owner(p_property_id) then
    return;
  end if;

  return query
    select
      p.id,
      p.title,
      u.id,
      u.unit_number,
      t.id,
      t.full_name,
      t.phone,
      l.id,
      l.status,
      l.start_date,
      l.end_date,
      l.monthly_rent,
      l.rent_due_day
    from public.leases l
    join public.units u on u.id = l.unit_id
    join public.properties p on p.id = u.property_id
    join public.tenants t on t.id = l.tenant_id
    where public.is_property_owner(p.id)
      and (p_property_id is null or p.id = p_property_id)
    order by p.title, u.unit_number, l.start_date desc;
end;
$$;

revoke all on function public.owner_tenant_overview(uuid) from public, anon, authenticated;
grant execute on function public.owner_tenant_overview(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Owner financial summaries
-- ---------------------------------------------------------------------------
-- These functions read the existing finance ledger only. They return per-
-- property aggregates, never tenant payment or receipt detail, and they are
-- guarded by verified ownership on every row.

create or replace function public.owner_finance_summary(p_property_id uuid default null)
returns table (
  property_id uuid,
  property_title text,
  billed numeric,
  collected numeric,
  outstanding numeric,
  deposits_held numeric,
  deposits_outstanding numeric,
  payment_count bigint,
  receipt_count bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if p_property_id is not null and not public.is_property_owner(p_property_id) then
    return;
  end if;

  return query
    with owned_properties as (
      select p.id, p.title
      from public.properties p
      where public.is_property_owner(p.id)
        and (p_property_id is null or p.id = p_property_id)
    ),
    scoped_charges as (
      select
        c.id,
        u.property_id,
        c.amount + coalesce((
          select sum(aa.amount_delta)
          from public.allocation_adjustments aa
          where aa.charge_id = c.id
            and aa.adjustment_type = 'charge_adjustment'
        ), 0) as billed,
        coalesce((
          select sum(pa.amount)
          from public.payment_allocations pa
          where pa.charge_id = c.id
        ), 0) as allocated
      from public.rent_charges c
      join public.leases l on l.id = c.lease_id
      join public.units u on u.id = l.unit_id
      where u.property_id in (select id from owned_properties)
    ),
    scoped_payments as (
      select
        pay.id,
        u.property_id,
        pay.amount - coalesce((
          select sum(pr.amount)
          from public.payment_reversals pr
          where pr.payment_id = pay.id
        ), 0) as collected
      from public.payments pay
      join public.leases l on l.id = pay.lease_id
      join public.units u on u.id = l.unit_id
      where pay.payment_type = 'rent'
        and u.property_id in (select id from owned_properties)
    ),
    scoped_deposits as (
      select
        d.id,
        u.property_id,
        d.required_amount,
        coalesce((
          select sum(dt.amount)
          from public.deposit_transactions dt
          where dt.deposit_id = d.id
        ), 0) as held
      from public.deposits d
      join public.leases l on l.id = d.lease_id
      join public.units u on u.id = l.unit_id
      where u.property_id in (select id from owned_properties)
    ),
    scoped_receipts as (
      select r.id, u.property_id
      from public.receipts r
      join public.payments pay on pay.id = r.payment_id
      join public.leases l on l.id = pay.lease_id
      join public.units u on u.id = l.unit_id
      where u.property_id in (select id from owned_properties)
    )
    select
      o.id,
      o.title,
      coalesce((select sum(sc.billed) from scoped_charges sc where sc.property_id = o.id), 0)::numeric(12, 2),
      coalesce((select sum(sp.collected) from scoped_payments sp where sp.property_id = o.id), 0)::numeric(12, 2),
      coalesce((select sum(greatest(sc.billed - sc.allocated, 0)) from scoped_charges sc where sc.property_id = o.id), 0)::numeric(12, 2),
      coalesce((select sum(sd.held) from scoped_deposits sd where sd.property_id = o.id), 0)::numeric(12, 2),
      coalesce((select sum(greatest(sd.required_amount - sd.held, 0)) from scoped_deposits sd where sd.property_id = o.id), 0)::numeric(12, 2),
      (select count(*) from scoped_payments sp where sp.property_id = o.id),
      (select count(*) from scoped_receipts sr where sr.property_id = o.id)
    from owned_properties o
    order by o.title;
end;
$$;

revoke all on function public.owner_finance_summary(uuid) from public, anon, authenticated;
grant execute on function public.owner_finance_summary(uuid) to authenticated, service_role;

create or replace function public.owner_financial_statement(
  p_property_id uuid,
  p_period text default null
)
returns table (
  period_month text,
  billed numeric,
  collected numeric,
  outstanding numeric
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if p_property_id is null or not public.is_property_owner(p_property_id) then
    return;
  end if;

  return query
    with charge_data as (
      select
        to_char(c.period_month, 'YYYY-MM') as period,
        c.amount + coalesce((
          select sum(aa.amount_delta)
          from public.allocation_adjustments aa
          where aa.charge_id = c.id
            and aa.adjustment_type = 'charge_adjustment'
        ), 0) as billed,
        coalesce((
          select sum(pa.amount)
          from public.payment_allocations pa
          where pa.charge_id = c.id
        ), 0) as allocated
      from public.rent_charges c
      join public.leases l on l.id = c.lease_id
      join public.units u on u.id = l.unit_id
      where u.property_id = p_property_id
        and (p_period is null or to_char(c.period_month, 'YYYY-MM') = p_period)
    )
    select
      cd.period,
      sum(cd.billed)::numeric(12, 2),
      sum(cd.allocated)::numeric(12, 2),
      sum(greatest(cd.billed - cd.allocated, 0))::numeric(12, 2)
    from charge_data cd
    group by cd.period
    order by cd.period desc;
end;
$$;

revoke all on function public.owner_financial_statement(uuid, text) from public, anon, authenticated;
grant execute on function public.owner_financial_statement(uuid, text) to authenticated, service_role;
