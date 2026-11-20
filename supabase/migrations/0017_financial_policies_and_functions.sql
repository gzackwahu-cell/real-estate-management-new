-- Stage 2 extension: financial RLS, atomic RPCs and audit controls.
-- Local migration only. Do not run manually until approved.
--
-- Financial tables grant SELECT only. Every write goes through a SECURITY
-- DEFINER RPC that checks permission, property assignment and business rules,
-- then writes an audit_log row with actor, reason and metadata.

alter table public.payment_methods enable row level security;
alter table public.rent_charges enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.allocation_adjustments enable row level security;
alter table public.payment_reversals enable row level security;
alter table public.deposits enable row level security;
alter table public.deposit_transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.mpesa_transactions enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists "payment_methods_select_authenticated" on public.payment_methods;
create policy "payment_methods_select_authenticated"
on public.payment_methods for select to authenticated
using (true);

drop policy if exists "rent_charges_select_scoped" on public.rent_charges;
create policy "rent_charges_select_scoped"
on public.rent_charges for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('rent', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_charge(id)
    )
  )
  or public.is_tenant_charge(id)
);

drop policy if exists "payments_select_scoped" on public.payments;
create policy "payments_select_scoped"
on public.payments for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('payments', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_payment(id)
    )
  )
  or public.is_tenant_payment(id)
);

drop policy if exists "payment_allocations_select_scoped" on public.payment_allocations;
create policy "payment_allocations_select_scoped"
on public.payment_allocations for select to authenticated
using (
  exists (
    select 1
    from public.payments p
    where p.id = payment_allocations.payment_id
      and (
        (
          public.is_staff_member()
          and public.has_permission('payments', 'view')
          and (
            public.is_unscoped_staff()
            or public.is_assigned_payment(p.id)
          )
        )
        or public.is_tenant_payment(p.id)
      )
  )
);

drop policy if exists "allocation_adjustments_select_scoped" on public.allocation_adjustments;
create policy "allocation_adjustments_select_scoped"
on public.allocation_adjustments for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('payments', 'view')
    and (
      public.is_unscoped_staff()
      or (
        public.is_assigned_charge(charge_id)
        and (payment_id is null or public.is_assigned_payment(payment_id))
      )
    )
  )
  or public.is_tenant_charge(charge_id)
);

drop policy if exists "payment_reversals_select_scoped" on public.payment_reversals;
create policy "payment_reversals_select_scoped"
on public.payment_reversals for select to authenticated
using (
  exists (
    select 1
    from public.payments p
    where p.id = payment_reversals.payment_id
      and (
        (
          public.is_staff_member()
          and public.has_permission('payments', 'view')
          and (
            public.is_unscoped_staff()
            or public.is_assigned_payment(p.id)
          )
        )
        or public.is_tenant_payment(p.id)
      )
  )
);

drop policy if exists "deposits_select_scoped" on public.deposits;
create policy "deposits_select_scoped"
on public.deposits for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('deposits', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_deposit(id)
    )
  )
  or public.is_tenant_deposit(id)
);

drop policy if exists "deposit_transactions_select_scoped" on public.deposit_transactions;
create policy "deposit_transactions_select_scoped"
on public.deposit_transactions for select to authenticated
using (
  exists (
    select 1
    from public.deposits d
    where d.id = deposit_transactions.deposit_id
      and (
        (
          public.is_staff_member()
          and public.has_permission('deposits', 'view')
          and (
            public.is_unscoped_staff()
            or public.is_assigned_deposit(d.id)
          )
        )
        or public.is_tenant_deposit(d.id)
      )
  )
);

drop policy if exists "receipts_select_scoped" on public.receipts;
create policy "receipts_select_scoped"
on public.receipts for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('payments', 'view')
    and (
      public.is_unscoped_staff()
      or public.is_assigned_receipt(id)
    )
  )
  or public.is_tenant_receipt(id)
);

drop policy if exists "mpesa_transactions_select_scoped" on public.mpesa_transactions;
create policy "mpesa_transactions_select_scoped"
on public.mpesa_transactions for select to authenticated
using (
  payment_id is not null
  and public.is_staff_member()
  and public.has_permission('payments', 'view')
  and (
    public.is_unscoped_staff()
    or public.is_assigned_payment(payment_id)
  )
);

-- Audit history is intentionally available only to unscoped reporting staff.
drop policy if exists "audit_log_select_reports" on public.audit_log;
create policy "audit_log_select_reports"
on public.audit_log for select to authenticated
using (
  public.is_staff_member()
  and public.has_permission('reports', 'view')
  and public.is_unscoped_staff()
);

-- No INSERT, UPDATE or DELETE policies are granted on financial records.
-- Corrections are append-only reversal and adjustment records created by RPCs.

-- ---------------------------------------------------------------------------
-- Shared audit helper
-- ---------------------------------------------------------------------------

create or replace function public.log_financial_event(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (
    entity_type,
    entity_id,
    action,
    reason,
    metadata,
    actor_id,
    actor_email
  )
  values (
    p_entity_type,
    p_entity_id,
    p_action,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid(),
    auth.jwt() ->> 'email'
  );
end;
$$;

revoke all on function public.log_financial_event(text, uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rent charge generation and authorized adjustment
-- ---------------------------------------------------------------------------

create or replace function public.generate_rent_charges(p_period_month date)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month date := date_trunc('month', p_period_month)::date;
  v_month_end date := (v_month + interval '1 month - 1 day')::date;
  v_days_in_month integer := extract(day from (v_month + interval '1 month - 1 day'))::integer;
  v_lease record;
  v_period_start date;
  v_period_end date;
  v_effective_end date;
  v_amount numeric(12, 2);
  v_due_date date;
  v_inserted integer := 0;
begin
  if not public.is_staff_member()
     or not public.has_permission('rent', 'create') then
    raise exception 'You do not have permission to generate rent charges.'
      using errcode = 'insufficient_privilege';
  end if;

  for v_lease in
    select l.*, u.property_id
    from public.leases l
    join public.units u on u.id = l.unit_id
    where l.status = 'active'
      and l.start_date <= v_month_end
      and l.end_date >= v_month
      and (
        public.is_unscoped_staff()
        or public.is_assigned_unit(l.unit_id)
        or public.is_assigned_property(u.property_id)
      )
    loop
      v_period_start := greatest(v_month, v_lease.start_date);
      v_effective_end := least(
        v_lease.end_date,
        coalesce(v_lease.terminated_on, v_lease.end_date)
      );

      if v_effective_end < v_period_start then
        continue;
      end if;

      v_period_end := least(v_month_end, v_effective_end);
      v_due_date := make_date(
        extract(year from v_month)::integer,
        extract(month from v_month)::integer,
        v_lease.rent_due_day
      );
      v_amount := round(
        v_lease.monthly_rent
        * ((v_period_end - v_period_start + 1)::numeric / v_days_in_month),
        2
      );

      insert into public.rent_charges (
        lease_id,
        period_month,
        period_start,
        period_end,
        due_date,
        amount,
        source,
        notes,
        created_by,
        updated_by
      )
      values (
        v_lease.id,
        v_month,
        v_period_start,
        v_period_end,
        v_due_date,
        v_amount,
        'generated',
        'Generated from active lease terms.',
        auth.uid(),
        auth.uid()
      )
      on conflict (lease_id, period_month) do nothing;

      if found then
        v_inserted := v_inserted + 1;
      end if;
    end loop;

    perform public.log_financial_event(
      'rent_charge',
      null,
      'generate',
      'Rent charges generated for ' || v_month::text || '.',
      jsonb_build_object('period_month', v_month, 'charges_created', v_inserted)
    );

    return v_inserted;
end;
$$;

create or replace function public.adjust_rent_charge(
  p_charge_id uuid,
  p_amount_delta numeric,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_charge public.rent_charges%rowtype;
  v_current numeric(12, 2);
  v_allocated numeric(12, 2);
begin
  if not public.is_staff_member()
     or not public.has_permission('rent', 'approve') then
    raise exception 'You do not have permission to adjust rent charges.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_amount_delta is null or p_amount_delta = 0 then
    raise exception 'Enter a non-zero adjustment amount.'
      using errcode = 'check_violation';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required for rent charge adjustments.'
      using errcode = 'check_violation';
  end if;

  select * into v_charge
  from public.rent_charges
  where id = p_charge_id
  for update;

  if not found then
    raise exception 'Rent charge not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_charge(p_charge_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  v_current := v_charge.amount + coalesce((
    select sum(aa.amount_delta)
    from public.allocation_adjustments aa
    where aa.charge_id = p_charge_id
      and aa.adjustment_type = 'charge_adjustment'
  ), 0);

  if v_current + p_amount_delta < 0 then
    raise exception 'An adjustment cannot make a charge negative.'
      using errcode = 'check_violation';
  end if;

  v_allocated := coalesce((
    select sum(pa.amount)
    from public.payment_allocations pa
    where pa.charge_id = p_charge_id
  ), 0);

  if v_allocated > v_current + p_amount_delta then
    raise exception 'An adjustment cannot be less than the amount already allocated.'
      using errcode = 'check_violation';
  end if;

  insert into public.allocation_adjustments (
    charge_id,
    adjustment_type,
    amount_delta,
    reason,
    created_by
  )
  values (
    p_charge_id,
    'charge_adjustment',
    p_amount_delta,
    btrim(p_reason),
    auth.uid()
  );

  perform public.log_financial_event(
    'rent_charge',
    p_charge_id,
    'adjust',
    btrim(p_reason),
    jsonb_build_object('amount_delta', p_amount_delta)
  );

  return p_charge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- FIFO allocation and receipts
-- ---------------------------------------------------------------------------

create or replace function public.allocate_payment_fifo(p_payment_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_charge record;
  v_remaining numeric(12, 2);
  v_outstanding numeric(12, 2);
  v_amount numeric(12, 2);
  v_total numeric(12, 2) := 0;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.'
      using errcode = 'no_data_found';
  end if;

  if v_payment.payment_type <> 'rent' then
    return 0;
  end if;

  v_remaining := v_payment.amount
    - coalesce((select sum(amount) from public.payment_reversals where payment_id = p_payment_id), 0)
    - coalesce((select sum(amount) from public.payment_allocations where payment_id = p_payment_id), 0);

  if v_remaining <= 0 then
    return 0;
  end if;

  for v_charge in
    select rc.*
    from public.rent_charges rc
    where rc.lease_id = v_payment.lease_id
    order by rc.period_start, rc.due_date, rc.created_at, rc.id
  loop
    exit when v_remaining <= 0;

    v_outstanding := v_charge.amount
      + coalesce((
          select sum(aa.amount_delta)
          from public.allocation_adjustments aa
          where aa.charge_id = v_charge.id
            and aa.adjustment_type = 'charge_adjustment'
        ), 0)
      - coalesce((
          select sum(pa.amount)
          from public.payment_allocations pa
          where pa.charge_id = v_charge.id
        ), 0);

    if v_outstanding <= 0 then
      continue;
    end if;

    v_amount := least(v_remaining, v_outstanding);

    insert into public.payment_allocations (
      payment_id,
      charge_id,
      amount,
      allocated_by
    )
    values (
      p_payment_id,
      v_charge.id,
      v_amount,
      auth.uid()
    )
    on conflict (payment_id, charge_id) do update
    set amount = public.payment_allocations.amount + excluded.amount,
        allocated_at = now(),
        allocated_by = auth.uid();

    v_remaining := v_remaining - v_amount;
    v_total := v_total + v_amount;
  end loop;

  return v_total;
end;
$$;

create or replace function public.issue_receipt_for_payment(
  p_payment_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_receipt_id uuid;
  v_number text;
begin
  select id into v_receipt_id
  from public.receipts
  where payment_id = p_payment_id;

  if found then
    return v_receipt_id;
  end if;

  if not exists (select 1 from public.payments where id = p_payment_id) then
    raise exception 'Payment not found.'
      using errcode = 'no_data_found';
  end if;

  v_number := 'RCPT-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(nextval('public.receipt_number_seq')::text, 6, '0');

  insert into public.receipts (receipt_number, payment_id, issued_by, notes)
  values (v_number, p_payment_id, auth.uid(), nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_receipt_id;

  perform public.log_financial_event(
    'receipt',
    v_receipt_id,
    'issue',
    'Receipt issued for payment ' || p_payment_id::text || '.',
    jsonb_build_object('receipt_number', v_number, 'payment_id', p_payment_id)
  );

  return v_receipt_id;
end;
$$;

create or replace function public.issue_receipt(
  p_payment_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff_member()
     or not public.has_permission('payments', 'edit') then
    raise exception 'You do not have permission to issue receipts.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_payment(p_payment_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  return public.issue_receipt_for_payment(p_payment_id, p_notes);
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment recording
-- ---------------------------------------------------------------------------

create or replace function public.record_payment(
  p_tenant_id uuid,
  p_lease_id uuid,
  p_payment_type text,
  p_payment_method_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_transaction_reference text default null,
  p_notes text default null,
  p_allocate_rent boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lease public.leases%rowtype;
  v_method public.payment_methods%rowtype;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_allocated numeric(12, 2) := 0;
  v_deposit_id uuid;
begin
  if not public.is_staff_member()
     or not public.has_permission('payments', 'create') then
    raise exception 'You do not have permission to record payments.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_payment_type not in ('rent', 'deposit') then
    raise exception 'Invalid payment type.'
      using errcode = 'check_violation';
  end if;

  if p_payment_type = 'deposit'
     and not public.has_permission('deposits', 'create') then
    raise exception 'You do not have permission to record deposit payments.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.'
      using errcode = 'check_violation';
  end if;

  select * into v_lease from public.leases where id = p_lease_id for share;
  if not found then
    raise exception 'Lease not found.'
      using errcode = 'no_data_found';
  end if;

  if v_lease.tenant_id <> p_tenant_id then
    raise exception 'The lease does not belong to this tenant.'
      using errcode = 'check_violation';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_unit(v_lease.unit_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_method from public.payment_methods where id = p_payment_method_id;
  if not found or not v_method.is_active then
    raise exception 'Select an active payment method.'
      using errcode = 'check_violation';
  end if;

  if v_method.requires_reference
     and (p_transaction_reference is null or length(btrim(p_transaction_reference)) = 0) then
    raise exception 'A transaction reference is required for this payment method.'
      using errcode = 'check_violation';
  end if;

  insert into public.payments (
    tenant_id,
    lease_id,
    payment_type,
    payment_method_id,
    amount,
    payment_date,
    transaction_reference,
    notes,
    created_by,
    updated_by
  )
  values (
    p_tenant_id,
    p_lease_id,
    p_payment_type,
    p_payment_method_id,
    p_amount,
    p_payment_date,
    nullif(btrim(coalesce(p_transaction_reference, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning id into v_payment_id;

  if p_payment_type = 'rent' and p_allocate_rent then
    v_allocated := public.allocate_payment_fifo(v_payment_id);
  end if;

  if p_payment_type = 'deposit' then
    select id into v_deposit_id from public.deposits where lease_id = p_lease_id;

    if not found then
      insert into public.deposits (lease_id, required_amount, created_by, updated_by)
      values (p_lease_id, v_lease.deposit_amount, auth.uid(), auth.uid())
      returning id into v_deposit_id;
    end if;

    insert into public.deposit_transactions (
      deposit_id,
      transaction_type,
      amount,
      transaction_date,
      payment_id,
      payment_method_id,
      transaction_reference,
      reason,
      created_by
    )
    values (
      v_deposit_id,
      'payment',
      p_amount,
      p_payment_date,
      v_payment_id,
      p_payment_method_id,
      nullif(btrim(coalesce(p_transaction_reference, '')), ''),
      'Deposit payment recorded.',
      auth.uid()
    );
  end if;

  v_receipt_id := public.issue_receipt_for_payment(
    v_payment_id,
    'Auto-issued when payment was recorded.'
  );

  perform public.log_financial_event(
    'payment',
    v_payment_id,
    'record',
    coalesce(nullif(btrim(p_notes), ''), 'Payment recorded.'),
    jsonb_build_object(
      'payment_type', p_payment_type,
      'amount', p_amount,
      'allocated_amount', v_allocated,
      'receipt_id', v_receipt_id
    )
  );

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'allocated_amount', v_allocated,
    'unallocated_amount', case
      when p_payment_type = 'deposit' then 0
      else p_amount - v_allocated
    end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual allocation and reallocation
-- ---------------------------------------------------------------------------

create or replace function public.allocate_payment(
  p_payment_id uuid,
  p_allocations jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_item jsonb;
  v_charge_id uuid;
  v_charge public.rent_charges%rowtype;
  v_amount numeric(12, 2);
  v_available numeric(12, 2);
  v_outstanding numeric(12, 2);
  v_total numeric(12, 2) := 0;
begin
  if not public.is_staff_member()
     or not public.has_permission('payments', 'edit') then
    raise exception 'You do not have permission to allocate payments.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required for manual allocation.'
      using errcode = 'check_violation';
  end if;

  if p_allocations is null or jsonb_array_length(p_allocations) = 0 then
    raise exception 'Select at least one charge.'
      using errcode = 'check_violation';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_payment(p_payment_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_payment.payment_type <> 'rent' then
    raise exception 'Only rent payments can be allocated to rent charges.'
      using errcode = 'check_violation';
  end if;

  for v_item in select value from jsonb_array_elements(p_allocations)
  loop
    v_charge_id := (v_item ->> 'chargeId')::uuid;
    v_amount := (v_item ->> 'amount')::numeric;

    if v_amount is null or v_amount <= 0 then
      raise exception 'Allocation amounts must be greater than zero.'
        using errcode = 'check_violation';
    end if;

    select * into v_charge from public.rent_charges where id = v_charge_id for update;
    if not found or v_charge.lease_id <> v_payment.lease_id then
      raise exception 'The selected charge does not belong to this payment lease.'
        using errcode = 'check_violation';
    end if;

    v_available := v_payment.amount
      - coalesce((select sum(amount) from public.payment_reversals where payment_id = p_payment_id), 0)
      - coalesce((select sum(amount) from public.payment_allocations where payment_id = p_payment_id), 0);

    v_outstanding := v_charge.amount
      + coalesce((
          select sum(aa.amount_delta)
          from public.allocation_adjustments aa
          where aa.charge_id = v_charge_id
            and aa.adjustment_type = 'charge_adjustment'
        ), 0)
      - coalesce((select sum(amount) from public.payment_allocations where charge_id = v_charge_id), 0);

    if v_amount > least(v_available, v_outstanding) then
      raise exception 'An allocation exceeds the available payment or outstanding charge.'
        using errcode = 'check_violation';
    end if;

    insert into public.payment_allocations (
      payment_id,
      charge_id,
      amount,
      allocated_by
    )
    values (p_payment_id, v_charge_id, v_amount, auth.uid())
    on conflict (payment_id, charge_id) do update
    set amount = public.payment_allocations.amount + excluded.amount,
        allocated_at = now(),
        allocated_by = auth.uid();

    insert into public.allocation_adjustments (
      payment_id,
      charge_id,
      adjustment_type,
      amount_delta,
      reason,
      created_by
    )
    values (
      p_payment_id,
      v_charge_id,
      'manual_allocation',
      v_amount,
      btrim(p_reason),
      auth.uid()
    );

    v_total := v_total + v_amount;
  end loop;

  perform public.log_financial_event(
    'payment',
    p_payment_id,
    'allocate',
    btrim(p_reason),
    jsonb_build_object('allocated_amount', v_total)
  );

  return jsonb_build_object('allocated_amount', v_total);
end;
$$;

create or replace function public.reallocate_payment(
  p_from_allocation_id uuid,
  p_to_charge_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.payment_allocations%rowtype;
  v_target public.rent_charges%rowtype;
  v_outstanding numeric(12, 2);
  v_remaining numeric(12, 2);
begin
  if not public.is_staff_member()
     or not public.has_permission('payments', 'approve') then
    raise exception 'You do not have permission to reallocate payments.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required for reallocation.'
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Reallocation amount must be greater than zero.'
      using errcode = 'check_violation';
  end if;

  select * into v_source
  from public.payment_allocations
  where id = p_from_allocation_id
  for update;

  if not found then
    raise exception 'Source allocation not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_payment(v_source.payment_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_amount > v_source.amount then
    raise exception 'Reallocation exceeds the source allocation.'
      using errcode = 'check_violation';
  end if;

  select * into v_target from public.rent_charges where id = p_to_charge_id for update;
  if not found then
    raise exception 'Target charge not found.'
      using errcode = 'no_data_found';
  end if;

  select l.id into v_target.id
  from public.leases l
  where l.id = v_target.lease_id
    and l.id = (select lease_id from public.payments where id = v_source.payment_id);

  if not found then
    raise exception 'The target charge does not belong to this payment lease.'
      using errcode = 'check_violation';
  end if;

  v_outstanding := v_target.amount
    + coalesce((
        select sum(aa.amount_delta)
        from public.allocation_adjustments aa
        where aa.charge_id = p_to_charge_id
          and aa.adjustment_type = 'charge_adjustment'
      ), 0)
    - coalesce((select sum(amount) from public.payment_allocations where charge_id = p_to_charge_id), 0);

  if p_amount > v_outstanding then
    raise exception 'Reallocation exceeds the outstanding target charge.'
      using errcode = 'check_violation';
  end if;

  v_remaining := v_source.amount - p_amount;

  if v_remaining = 0 then
    delete from public.payment_allocations where id = v_source.id;
  else
    update public.payment_allocations
    set amount = v_remaining,
        allocated_at = now(),
        allocated_by = auth.uid()
    where id = v_source.id;
  end if;

  insert into public.payment_allocations (
    payment_id,
    charge_id,
    amount,
    allocated_by
  )
  values (v_source.payment_id, p_to_charge_id, p_amount, auth.uid())
  on conflict (payment_id, charge_id) do update
  set amount = public.payment_allocations.amount + excluded.amount,
      allocated_at = now(),
      allocated_by = auth.uid();

  insert into public.allocation_adjustments (
    payment_id,
    charge_id,
    allocation_id,
    adjustment_type,
    amount_delta,
    reason,
    created_by
  )
  values (
    v_source.payment_id,
    p_to_charge_id,
    case when v_remaining = 0 then null else v_source.id end,
    'reallocation',
    p_amount,
    btrim(p_reason),
    auth.uid()
  );

  perform public.log_financial_event(
    'payment',
    v_source.payment_id,
    'reallocate',
    btrim(p_reason),
    jsonb_build_object(
      'from_allocation_id', v_source.id,
      'to_charge_id', p_to_charge_id,
      'amount', p_amount
    )
  );

  return jsonb_build_object('reallocated_amount', p_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment reversals
-- ---------------------------------------------------------------------------

create or replace function public.reverse_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_reversal_id uuid;
  v_allocation record;
  v_reduce numeric(12, 2);
  v_remaining numeric(12, 2);
  v_available numeric(12, 2);
  v_deposit_id uuid;
  v_held numeric(12, 2);
begin
  if not public.is_staff_member()
     or not public.has_permission('payments', 'approve') then
    raise exception 'You do not have permission to reverse payments.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required for payment reversal.'
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Reversal amount must be greater than zero.'
      using errcode = 'check_violation';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_payment(p_payment_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  v_available := v_payment.amount
    - coalesce((select sum(amount) from public.payment_reversals where payment_id = p_payment_id), 0);

  if p_amount > v_available then
    raise exception 'Reversal exceeds the remaining payment amount.'
      using errcode = 'check_violation';
  end if;

  if v_payment.payment_type = 'deposit' then
    select id into v_deposit_id from public.deposits where lease_id = v_payment.lease_id;

    if found then
      v_held := coalesce((
        select sum(amount) from public.deposit_transactions where deposit_id = v_deposit_id
      ), 0);

      if v_held - p_amount < 0 then
        raise exception 'Reversal exceeds the deposit amount currently held.'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  insert into public.payment_reversals (payment_id, amount, reason, created_by)
  values (p_payment_id, p_amount, btrim(p_reason), auth.uid())
  returning id into v_reversal_id;

  -- Reduce only the reversed amount, newest allocations first.
  v_remaining := p_amount;

  for v_allocation in
    select pa.*
    from public.payment_allocations pa
    where pa.payment_id = p_payment_id
    order by pa.allocated_at desc, pa.created_at desc, pa.id desc
  loop
    exit when v_remaining <= 0;

    v_reduce := least(v_remaining, v_allocation.amount);

    if v_reduce = v_allocation.amount then
      delete from public.payment_allocations where id = v_allocation.id;
    else
      update public.payment_allocations
      set amount = amount - v_reduce,
          allocated_at = now(),
          allocated_by = auth.uid()
      where id = v_allocation.id;
    end if;

    insert into public.allocation_adjustments (
      payment_id,
      charge_id,
      allocation_id,
      adjustment_type,
      amount_delta,
      reason,
      created_by
    )
    values (
      p_payment_id,
      v_allocation.charge_id,
      case when v_reduce = v_allocation.amount then null else v_allocation.id end,
      'reversal',
      -v_reduce,
      'Allocation reduced by payment reversal: ' || btrim(p_reason),
      auth.uid()
    );

    v_remaining := v_remaining - v_reduce;
  end loop;

  if v_payment.payment_type = 'deposit' and v_deposit_id is not null then
    insert into public.deposit_transactions (
        deposit_id,
        transaction_type,
        amount,
        transaction_date,
        payment_id,
        payment_method_id,
        transaction_reference,
        reason,
        created_by
      )
      values (
        v_deposit_id,
        'adjustment',
        -p_amount,
        current_date,
        v_payment.id,
        v_payment.payment_method_id,
        v_payment.transaction_reference,
        'Deposit payment reversed: ' || btrim(p_reason),
        auth.uid()
      );
  end if;

  perform public.log_financial_event(
    'payment',
    p_payment_id,
    'reverse',
    btrim(p_reason),
    jsonb_build_object('reversal_id', v_reversal_id, 'amount', p_amount)
  );

  return jsonb_build_object('reversal_id', v_reversal_id, 'amount', p_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Deposit accounting
-- ---------------------------------------------------------------------------

create or replace function public.create_deposit_for_lease(
  p_lease_id uuid,
  p_required_amount numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lease public.leases%rowtype;
  v_deposit_id uuid;
  v_required numeric(12, 2);
begin
  if not public.is_staff_member()
     or not public.has_permission('deposits', 'create') then
    raise exception 'You do not have permission to create deposit records.'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_lease from public.leases where id = p_lease_id for share;
  if not found then
    raise exception 'Lease not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_unit(v_lease.unit_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  select id into v_deposit_id from public.deposits where lease_id = p_lease_id;
  if found then
    return v_deposit_id;
  end if;

  v_required := coalesce(p_required_amount, v_lease.deposit_amount);
  if v_required is null or v_required < 0 then
    raise exception 'Deposit amount cannot be negative.'
      using errcode = 'check_violation';
  end if;

  insert into public.deposits (lease_id, required_amount, notes, created_by, updated_by)
  values (
    p_lease_id,
    v_required,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  returning id into v_deposit_id;

  perform public.log_financial_event(
    'deposit',
    v_deposit_id,
    'create',
    'Deposit record created.',
    jsonb_build_object('required_amount', v_required)
  );

  return v_deposit_id;
end;
$$;

create or replace function public.record_deposit_transaction(
  p_deposit_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_transaction_date date,
  p_payment_method_id uuid default null,
  p_transaction_reference text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deposit public.deposits%rowtype;
  v_transaction_id uuid;
  v_held numeric(12, 2);
begin
  if p_transaction_type not in ('payment', 'refund', 'deduction', 'adjustment') then
    raise exception 'Invalid deposit transaction type.'
      using errcode = 'check_violation';
  end if;

  if p_transaction_type = 'payment' then
    if not public.is_staff_member()
       or not public.has_permission('deposits', 'create') then
      raise exception 'You do not have permission to record deposit payments.'
        using errcode = 'insufficient_privilege';
    end if;
  else
    if not public.is_staff_member()
       or not public.has_permission('deposits', 'edit') then
      raise exception 'You do not have permission to adjust deposits.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reason is required for deposit transactions.'
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'Deposit amount cannot be zero.'
      using errcode = 'check_violation';
  end if;

  if p_transaction_type = 'payment' and p_amount < 0 then
    raise exception 'Deposit payments must be positive.'
      using errcode = 'check_violation';
  end if;

  if p_transaction_type in ('refund', 'deduction') and p_amount > 0 then
    raise exception 'Enter refunds and deductions as negative amounts.'
      using errcode = 'check_violation';
  end if;

  if p_transaction_type = 'payment' and p_payment_method_id is null then
    raise exception 'Select a payment method for deposit payments.'
      using errcode = 'check_violation';
  end if;

  select * into v_deposit from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit record not found.'
      using errcode = 'no_data_found';
  end if;

  if not public.is_unscoped_staff()
     and not public.is_assigned_deposit(p_deposit_id) then
    raise exception 'You are not assigned to this property.'
      using errcode = 'insufficient_privilege';
  end if;

  v_held := coalesce((
    select sum(amount) from public.deposit_transactions where deposit_id = p_deposit_id
  ), 0);

  if v_held + p_amount < 0 then
    raise exception 'Deposit balance cannot become negative.'
      using errcode = 'check_violation';
  end if;

  insert into public.deposit_transactions (
    deposit_id,
    transaction_type,
    amount,
    transaction_date,
    payment_method_id,
    transaction_reference,
    reason,
    created_by
  )
  values (
    p_deposit_id,
    p_transaction_type,
    p_amount,
    p_transaction_date,
    p_payment_method_id,
    nullif(btrim(coalesce(p_transaction_reference, '')), ''),
    btrim(p_reason),
    auth.uid()
  )
  returning id into v_transaction_id;

  perform public.log_financial_event(
    'deposit',
    p_deposit_id,
    p_transaction_type,
    btrim(p_reason),
    jsonb_build_object('amount', p_amount, 'transaction_id', v_transaction_id)
  );

  return v_transaction_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.allocate_payment_fifo(uuid) from public, anon, authenticated;
revoke all on function public.issue_receipt_for_payment(uuid, text) from public, anon, authenticated;

revoke all on function public.generate_rent_charges(date) from public, anon;
revoke all on function public.adjust_rent_charge(uuid, numeric, text) from public, anon;
revoke all on function public.issue_receipt(uuid, text) from public, anon;
revoke all on function public.record_payment(uuid, uuid, text, uuid, numeric, date, text, text, boolean) from public, anon;
revoke all on function public.allocate_payment(uuid, jsonb, text) from public, anon;
revoke all on function public.reallocate_payment(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.reverse_payment(uuid, numeric, text) from public, anon;
revoke all on function public.create_deposit_for_lease(uuid, numeric, text) from public, anon;
revoke all on function public.record_deposit_transaction(uuid, text, numeric, date, uuid, text, text) from public, anon;

grant execute on function public.generate_rent_charges(date) to authenticated, service_role;
grant execute on function public.adjust_rent_charge(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.issue_receipt(uuid, text) to authenticated, service_role;
grant execute on function public.record_payment(uuid, uuid, text, uuid, numeric, date, text, text, boolean) to authenticated, service_role;
grant execute on function public.allocate_payment(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.reallocate_payment(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.reverse_payment(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.create_deposit_for_lease(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.record_deposit_transaction(uuid, text, numeric, date, uuid, text, text) to authenticated, service_role;
