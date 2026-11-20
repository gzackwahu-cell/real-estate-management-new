-- Stage 2 extension: rent and financial management foundation.
-- Local migration only. Do not run manually until approved.
--
-- Follows the approved blueprint money tables. No M-Pesa Daraja integration and
-- no live payment processing are included; mpesa_transactions is prepared only.
-- All monetary columns use numeric(12, 2). RLS and mutation RPCs live in 0017.

-- The approved blueprint says leases carry a deposit amount. Tenancy migration
-- 0014 only captured the boolean requirement, so this adds the amount without
-- removing the existing flag. Existing required deposits default to one month's
-- rent and can be corrected through an authorized deposit adjustment later.
alter table public.leases
  add column if not exists deposit_amount numeric(12, 2) not null default 0;

update public.leases
set deposit_amount = monthly_rent
where security_deposit_required
  and deposit_amount = 0;

alter table public.leases
  drop constraint if exists leases_deposit_amount_check;
alter table public.leases
  add constraint leases_deposit_amount_check check (deposit_amount >= 0);

create extension if not exists pgcrypto;

create sequence if not exists public.receipt_number_seq;

-- ---------------------------------------------------------------------------
-- Configurable payment methods
-- ---------------------------------------------------------------------------

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  requires_reference boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.payment_methods (code, name, requires_reference, is_active)
values
  ('mpesa', 'M-Pesa', true, true),
  ('bank_transfer', 'Bank transfer', true, true),
  ('cash', 'Cash', false, true),
  ('other', 'Other', false, true)
on conflict (code) do update
set name = excluded.name,
    requires_reference = excluded.requires_reference,
    is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Rent charges
-- ---------------------------------------------------------------------------

create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  period_month date not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  source text not null default 'generated',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_charges_amount_check check (amount >= 0),
  constraint rent_charges_period_check check (
    period_month = date_trunc('month', period_month)::date
    and period_start <= period_end
    and period_start >= period_month
    and period_end < (period_month + interval '1 month')::date
  ),
  constraint rent_charges_source_check check (source in ('generated', 'manual'))
);

create unique index if not exists rent_charges_lease_period_key
on public.rent_charges (lease_id, period_month);

create index if not exists rent_charges_due_date_idx
on public.rent_charges (due_date);
create index if not exists rent_charges_lease_idx
on public.rent_charges (lease_id);

drop trigger if exists rent_charges_set_updated_at on public.rent_charges;
create trigger rent_charges_set_updated_at
before update on public.rent_charges
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  lease_id uuid not null references public.leases(id) on delete restrict,
  payment_type text not null,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  amount numeric(12, 2) not null,
  payment_date date not null,
  transaction_reference text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_check check (amount > 0),
  constraint payments_type_check check (payment_type in ('rent', 'deposit'))
);

create unique index if not exists payments_reference_key
on public.payments (lower(btrim(transaction_reference)))
where transaction_reference is not null and btrim(transaction_reference) <> '';

create index if not exists payments_tenant_idx on public.payments (tenant_id);
create index if not exists payments_lease_idx on public.payments (lease_id);
create index if not exists payments_date_idx on public.payments (payment_date);
create index if not exists payments_type_idx on public.payments (payment_type);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payment allocation ledger
-- ---------------------------------------------------------------------------

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  charge_id uuid not null references public.rent_charges(id) on delete restrict,
  amount numeric(12, 2) not null,
  allocated_at timestamptz not null default now(),
  allocated_by uuid references public.profiles(id) on delete set null,
  constraint payment_allocations_amount_check check (amount > 0)
);

create unique index if not exists payment_allocations_payment_charge_key
on public.payment_allocations (payment_id, charge_id);

create index if not exists payment_allocations_charge_idx
on public.payment_allocations (charge_id);

-- ---------------------------------------------------------------------------
-- Authorized corrections and audit records
-- ---------------------------------------------------------------------------

-- amount_delta semantics:
--   charge_adjustment - signed change to the charge's effective amount
--   reallocation      - positive amount moved from allocation_id to charge_id
--   reversal          - negative amount removed from allocation_id
--   manual_allocation - positive amount assigned from unallocated credit
create table if not exists public.allocation_adjustments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete restrict,
  charge_id uuid not null references public.rent_charges(id) on delete restrict,
  allocation_id uuid references public.payment_allocations(id) on delete set null,
  adjustment_type text not null,
  amount_delta numeric(12, 2) not null,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint allocation_adjustments_type_check check (
    adjustment_type in ('charge_adjustment', 'reallocation', 'reversal', 'manual_allocation')
  ),
  constraint allocation_adjustments_amount_check check (amount_delta <> 0),
  constraint allocation_adjustments_reason_check check (length(btrim(reason)) > 0)
);

create index if not exists allocation_adjustments_charge_idx
on public.allocation_adjustments (charge_id);
create index if not exists allocation_adjustments_payment_idx
on public.allocation_adjustments (payment_id);

create table if not exists public.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  amount numeric(12, 2) not null,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint payment_reversals_amount_check check (amount > 0),
  constraint payment_reversals_reason_check check (length(btrim(reason)) > 0)
);

create index if not exists payment_reversals_payment_idx
on public.payment_reversals (payment_id);

-- ---------------------------------------------------------------------------
-- Deposits
-- ---------------------------------------------------------------------------

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null unique references public.leases(id) on delete restrict,
  required_amount numeric(12, 2) not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposits_required_amount_check check (required_amount >= 0)
);

drop trigger if exists deposits_set_updated_at on public.deposits;
create trigger deposits_set_updated_at
before update on public.deposits
for each row execute function public.set_updated_at();

-- Signed ledger: positive increases held funds, negative reduces them.
create table if not exists public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  deposit_id uuid not null references public.deposits(id) on delete restrict,
  transaction_type text not null,
  amount numeric(12, 2) not null,
  transaction_date date not null,
  payment_id uuid references public.payments(id) on delete restrict,
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  transaction_reference text,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint deposit_transactions_type_check check (
    transaction_type in ('payment', 'refund', 'deduction', 'adjustment')
  ),
  constraint deposit_transactions_amount_check check (amount <> 0),
  constraint deposit_transactions_reason_check check (length(btrim(reason)) > 0)
);

create index if not exists deposit_transactions_deposit_idx
on public.deposit_transactions (deposit_id);

-- ---------------------------------------------------------------------------
-- Receipts and M-Pesa preparation
-- ---------------------------------------------------------------------------

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id) on delete set null,
  notes text,
  constraint receipts_number_not_blank check (length(btrim(receipt_number)) > 0)
);

create index if not exists receipts_issued_at_idx on public.receipts (issued_at);

-- Prepared only. No callback handler or network integration is included.
create table if not exists public.mpesa_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  payment_id uuid references public.payments(id) on delete set null,
  result_code text,
  result_desc text,
  amount numeric(12, 2),
  msisdn text,
  raw_payload jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mpesa_transactions_id_not_blank check (length(btrim(transaction_id)) > 0)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now(),
  constraint audit_log_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint audit_log_action_not_blank check (length(btrim(action)) > 0),
  constraint audit_log_reason_not_blank check (length(btrim(reason)) > 0)
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.validate_payment_tenant_lease()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
begin
  select l.tenant_id into v_tenant_id
  from public.leases l
  where l.id = new.lease_id;

  if not found then
    raise exception 'Lease not found.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_tenant_id is distinct from new.tenant_id then
    raise exception 'The lease does not belong to this tenant.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_payment_tenant_lease on public.payments;
create trigger validate_payment_tenant_lease
before insert or update of tenant_id, lease_id on public.payments
for each row execute function public.validate_payment_tenant_lease();

-- Confirmed payments are immutable. All corrections use reversal records.
create or replace function public.prevent_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Confirmed payments cannot be deleted. Record a reversal instead.'
      using errcode = 'check_violation';
  end if;

  raise exception 'Confirmed payments are immutable. Record a reversal instead.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists prevent_payment_delete on public.payments;
create trigger prevent_payment_delete
before delete on public.payments
for each row execute function public.prevent_payment_mutation();

drop trigger if exists prevent_payment_update on public.payments;
create trigger prevent_payment_update
before update on public.payments
for each row execute function public.prevent_payment_mutation();

-- Allocations may never exceed the effective payment or the effective charge.
create or replace function public.validate_payment_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_charge public.rent_charges%rowtype;
  v_effective_payment numeric(12, 2);
  v_effective_charge numeric(12, 2);
  v_allocated_payment numeric(12, 2);
  v_allocated_charge numeric(12, 2);
  v_exclude_allocation_id uuid;
  v_conflicting_allocation_id uuid;
begin
  -- ON CONFLICT upserts arrive with a fresh NEW.id. Exclude the existing row
  -- for the same payment/charge so the validation sees the post-upsert total.
  v_exclude_allocation_id := new.id;
  select id into v_conflicting_allocation_id
  from public.payment_allocations
  where payment_id = new.payment_id
    and charge_id = new.charge_id
    and id is distinct from new.id
  limit 1;

  if v_conflicting_allocation_id is not null then
    v_exclude_allocation_id := v_conflicting_allocation_id;
  end if;

  select * into v_payment from public.payments where id = new.payment_id;
  if not found then
    raise exception 'Payment not found.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_payment.payment_type <> 'rent' then
    raise exception 'Only rent payments can be allocated to rent charges.'
      using errcode = 'check_violation';
  end if;

  select * into v_charge from public.rent_charges where id = new.charge_id;
  if not found then
    raise exception 'Rent charge not found.'
      using errcode = 'foreign_key_violation';
  end if;

  if v_charge.lease_id <> v_payment.lease_id then
    raise exception 'The charge and payment belong to different leases.'
      using errcode = 'check_violation';
  end if;

  v_effective_payment := v_payment.amount - coalesce((
    select sum(pr.amount)
    from public.payment_reversals pr
    where pr.payment_id = v_payment.id
  ), 0);

  v_allocated_payment := coalesce((
    select sum(pa.amount)
    from public.payment_allocations pa
    where pa.payment_id = v_payment.id
      and pa.id is distinct from v_exclude_allocation_id
  ), 0);

  if v_allocated_payment + new.amount > v_effective_payment then
    raise exception 'Allocation exceeds the available payment amount.'
      using errcode = 'check_violation';
  end if;

  v_effective_charge := v_charge.amount + coalesce((
    select sum(aa.amount_delta)
    from public.allocation_adjustments aa
    where aa.charge_id = v_charge.id
      and aa.adjustment_type = 'charge_adjustment'
  ), 0);

  v_allocated_charge := coalesce((
    select sum(pa.amount)
    from public.payment_allocations pa
    where pa.charge_id = v_charge.id
      and pa.id is distinct from v_exclude_allocation_id
  ), 0);

  if v_allocated_charge + new.amount > v_effective_charge then
    raise exception 'Allocation exceeds the outstanding charge amount.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_payment_allocation on public.payment_allocations;
create trigger validate_payment_allocation
before insert or update of payment_id, charge_id, amount on public.payment_allocations
for each row execute function public.validate_payment_allocation();

create or replace function public.validate_deposit_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deposit public.deposits%rowtype;
  v_payment public.payments%rowtype;
begin
  if new.transaction_type = 'payment' and new.amount <= 0 then
    raise exception 'Deposit payments must be positive.'
      using errcode = 'check_violation';
  end if;

  if new.transaction_type in ('refund', 'deduction') and new.amount >= 0 then
    raise exception 'Deposit refunds and deductions must be negative.'
      using errcode = 'check_violation';
  end if;

  select * into v_deposit from public.deposits where id = new.deposit_id;
  if not found then
    raise exception 'Deposit record not found.'
      using errcode = 'foreign_key_violation';
  end if;

  if new.payment_id is not null then
    select * into v_payment from public.payments where id = new.payment_id;
    if not found then
      raise exception 'Payment not found.'
        using errcode = 'foreign_key_violation';
    end if;

    if v_payment.payment_type <> 'deposit'
       or v_payment.lease_id <> v_deposit.lease_id then
      raise exception 'The payment does not match this deposit.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_deposit_transaction on public.deposit_transactions;
create trigger validate_deposit_transaction
before insert or update of deposit_id, transaction_type, amount, payment_id
on public.deposit_transactions
for each row execute function public.validate_deposit_transaction();

-- ---------------------------------------------------------------------------
-- Scoped-access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_assigned_charge(p_charge_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rent_charges rc
    join public.leases l on l.id = rc.lease_id
    join public.units u on u.id = l.unit_id
    join public.property_staff ps on ps.property_id = u.property_id
    where rc.id = p_charge_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_assigned_payment(p_payment_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.payments p
    join public.leases l on l.id = p.lease_id
    join public.units u on u.id = l.unit_id
    join public.property_staff ps on ps.property_id = u.property_id
    where p.id = p_payment_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_assigned_deposit(p_deposit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deposits d
    join public.leases l on l.id = d.lease_id
    join public.units u on u.id = l.unit_id
    join public.property_staff ps on ps.property_id = u.property_id
    where d.id = p_deposit_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_assigned_receipt(p_receipt_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.receipts r
    join public.payments p on p.id = r.payment_id
    join public.leases l on l.id = p.lease_id
    join public.units u on u.id = l.unit_id
    join public.property_staff ps on ps.property_id = u.property_id
    where r.id = p_receipt_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_tenant_charge(p_charge_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rent_charges rc
    join public.leases l on l.id = rc.lease_id
    join public.tenants t on t.id = l.tenant_id
    where rc.id = p_charge_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_payment(p_payment_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.payments p
    join public.tenants t on t.id = p.tenant_id
    where p.id = p_payment_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_deposit(p_deposit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deposits d
    join public.leases l on l.id = d.lease_id
    join public.tenants t on t.id = l.tenant_id
    where d.id = p_deposit_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_receipt(p_receipt_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.receipts r
    join public.payments p on p.id = r.payment_id
    join public.tenants t on t.id = p.tenant_id
    where r.id = p_receipt_id
      and t.profile_id = auth.uid()
  );
$$;

revoke all on function public.validate_payment_tenant_lease() from public, anon, authenticated;
revoke all on function public.prevent_payment_mutation() from public, anon, authenticated;
revoke all on function public.validate_payment_allocation() from public, anon, authenticated;
revoke all on function public.validate_deposit_transaction() from public, anon, authenticated;

revoke all on function public.is_assigned_charge(uuid) from public, anon;
revoke all on function public.is_assigned_payment(uuid) from public, anon;
revoke all on function public.is_assigned_deposit(uuid) from public, anon;
revoke all on function public.is_assigned_receipt(uuid) from public, anon;
revoke all on function public.is_tenant_charge(uuid) from public, anon;
revoke all on function public.is_tenant_payment(uuid) from public, anon;
revoke all on function public.is_tenant_deposit(uuid) from public, anon;
revoke all on function public.is_tenant_receipt(uuid) from public, anon;

grant execute on function public.is_assigned_charge(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_payment(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_deposit(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_receipt(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_charge(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_payment(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_deposit(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_receipt(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. 0017 adds RLS. Financial writes go through audited RPCs only.
-- ---------------------------------------------------------------------------

revoke all on public.payment_methods from public, anon, authenticated;
grant select on public.payment_methods to authenticated;
grant all on public.payment_methods to service_role;

revoke all on public.rent_charges from public, anon, authenticated;
grant select on public.rent_charges to authenticated;
grant all on public.rent_charges to service_role;

revoke all on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;

revoke all on public.payment_allocations from public, anon, authenticated;
grant select on public.payment_allocations to authenticated;
grant all on public.payment_allocations to service_role;

revoke all on public.allocation_adjustments from public, anon, authenticated;
grant select on public.allocation_adjustments to authenticated;
grant all on public.allocation_adjustments to service_role;

revoke all on public.payment_reversals from public, anon, authenticated;
grant select on public.payment_reversals to authenticated;
grant all on public.payment_reversals to service_role;

revoke all on public.deposits from public, anon, authenticated;
grant select on public.deposits to authenticated;
grant all on public.deposits to service_role;

revoke all on public.deposit_transactions from public, anon, authenticated;
grant select on public.deposit_transactions to authenticated;
grant all on public.deposit_transactions to service_role;

revoke all on public.receipts from public, anon, authenticated;
grant select on public.receipts to authenticated;
grant all on public.receipts to service_role;

revoke all on public.mpesa_transactions from public, anon, authenticated;
grant select on public.mpesa_transactions to authenticated;
grant all on public.mpesa_transactions to service_role;

revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;

grant usage on sequence public.receipt_number_seq to authenticated, service_role;
