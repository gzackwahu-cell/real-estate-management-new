-- Stage 1 extension: tenant, rental application and lease foundation.
-- Local migration only. Do not run manually until approved.
--
-- Builds on 0012/0013. No payment, receipt or rent-charge tables are included;
-- those belong to the financial milestone.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  id_reference text not null,
  address text not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint tenants_phone_not_blank check (length(btrim(phone)) > 0),
  constraint tenants_id_reference_not_blank check (length(btrim(id_reference)) > 0),
  constraint tenants_address_not_blank check (length(btrim(address)) > 0),
  constraint tenants_email_shape_check check (
    email is null
    or email = ''
    or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint tenants_emergency_contact_check check (
    (
      emergency_contact_name is null
      and emergency_contact_phone is null
    )
    or (
      emergency_contact_name is not null
      and emergency_contact_phone is not null
      and length(btrim(emergency_contact_name)) > 0
      and length(btrim(emergency_contact_phone)) > 0
    )
  ),
  constraint tenants_status_check check (
    status in ('active', 'inactive', 'blacklisted', 'archived')
  )
);

create unique index if not exists tenants_id_reference_key
on public.tenants (lower(btrim(id_reference)));

create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists tenants_profile_idx
on public.tenants (profile_id)
where profile_id is not null;

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rental applications
-- ---------------------------------------------------------------------------

create table if not exists public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  applicant_full_name text not null,
  applicant_phone text not null,
  applicant_email text,
  applicant_id_reference text not null,
  applicant_address text,
  proposed_rent numeric(12, 2) not null default 0,
  application_date date not null default current_date,
  notes text,
  status text not null default 'pending',
  decision_notes text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_applications_name_not_blank check (length(btrim(applicant_full_name)) > 0),
  constraint rental_applications_phone_not_blank check (length(btrim(applicant_phone)) > 0),
  constraint rental_applications_id_reference_not_blank check (length(btrim(applicant_id_reference)) > 0),
  constraint rental_applications_email_shape_check check (
    applicant_email is null
    or applicant_email = ''
    or applicant_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint rental_applications_rent_check check (proposed_rent >= 0),
  constraint rental_applications_status_check check (
    status in ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')
  ),
  constraint rental_applications_decision_notes_check check (
    status not in ('approved', 'rejected')
    or (decision_notes is not null and length(btrim(decision_notes)) > 0)
  )
);

-- One active application per applicant/unit pair. Closed applications remain
-- available for history and a fresh application can be created later.
create unique index if not exists rental_applications_open_key
on public.rental_applications (
  unit_id,
  lower(btrim(applicant_id_reference))
)
where status in ('pending', 'under_review');

create index if not exists rental_applications_status_idx
on public.rental_applications (status);

create index if not exists rental_applications_tenant_idx
on public.rental_applications (tenant_id)
where tenant_id is not null;

create index if not exists rental_applications_unit_idx
on public.rental_applications (unit_id);

drop trigger if exists rental_applications_set_updated_at on public.rental_applications;
create trigger rental_applications_set_updated_at
before update on public.rental_applications
for each row execute function public.set_updated_at();

-- Applications may only target an active unit that is not already occupied.
-- Re-reviewing an old application must not fail if the unit's status changes
-- later, so the trigger only runs when the unit itself is inserted or changed.
create or replace function public.validate_rental_application_unit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.units u
    where u.id = new.unit_id
      and u.is_active
      and u.occupancy_status in ('vacant', 'reserved')
  ) then
    raise exception 'The selected unit is not available for applications.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_rental_application_unit() from public, anon, authenticated, service_role;

drop trigger if exists validate_rental_application_unit on public.rental_applications;
create trigger validate_rental_application_unit
before insert or update of unit_id on public.rental_applications
for each row execute function public.validate_rental_application_unit();

-- ---------------------------------------------------------------------------
-- Leases
-- ---------------------------------------------------------------------------

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  source_application_id uuid references public.rental_applications(id) on delete set null,
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(12, 2) not null,
  security_deposit_required boolean not null default true,
  rent_due_day integer not null default 1,
  status text not null default 'draft',
  special_terms text,
  notes text,
  renewal_of uuid references public.leases(id) on delete set null,
  terminated_on date,
  termination_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_date_range_check check (end_date > start_date),
  constraint leases_rent_check check (monthly_rent >= 0),
  constraint leases_due_day_check check (rent_due_day between 1 and 28),
  constraint leases_status_check check (
    status in ('draft', 'pending', 'active', 'expired', 'terminated')
  ),
  constraint leases_termination_check check (
    (
      status = 'terminated'
      and terminated_on is not null
      and termination_reason is not null
      and length(btrim(termination_reason)) > 0
    )
    or (
      status <> 'terminated'
      and terminated_on is null
      and termination_reason is null
    )
  ),
  constraint leases_termination_date_check check (
    terminated_on is null or terminated_on >= start_date
  ),
  constraint leases_no_unit_overlap exclude using gist (
    unit_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('active', 'pending'))
);

create index if not exists leases_tenant_idx on public.leases (tenant_id);
create index if not exists leases_unit_idx on public.leases (unit_id);
create index if not exists leases_status_idx on public.leases (status);
create index if not exists leases_renewal_idx
on public.leases (renewal_of)
where renewal_of is not null;
create index if not exists leases_source_application_idx
on public.leases (source_application_id)
where source_application_id is not null;

drop trigger if exists leases_set_updated_at on public.leases;
create trigger leases_set_updated_at
before update on public.leases
for each row execute function public.set_updated_at();

-- Keep unit occupancy aligned with active leases. Draft and pending leases do
-- not reserve the unit; expired/terminated leases release it when no other
-- active lease remains.
create or replace function public.sync_unit_occupancy_from_leases()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_unit_id uuid;
  v_old_unit_id uuid;
begin
  if tg_op <> 'DELETE' then
    v_new_unit_id := new.unit_id;

    if new.status = 'active' then
      update public.units
      set occupancy_status = 'occupied'
      where id = v_new_unit_id;
    end if;
  end if;

  if tg_op <> 'INSERT' then
    v_old_unit_id := old.unit_id;

    if old.status = 'active'
       and (
         tg_op = 'DELETE'
         or new.status <> 'active'
         or new.unit_id <> old.unit_id
       )
    then
      if not exists (
        select 1
        from public.leases
        where unit_id = v_old_unit_id
          and status = 'active'
      ) then
        update public.units
        set occupancy_status = 'vacant'
        where id = v_old_unit_id;
      end if;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_unit_occupancy_from_leases() from public, anon, authenticated, service_role;

drop trigger if exists sync_unit_occupancy_from_leases on public.leases;
create trigger sync_unit_occupancy_from_leases
after insert or update or delete on public.leases
for each row execute function public.sync_unit_occupancy_from_leases();

-- ---------------------------------------------------------------------------
-- Tenancy scoped-access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_unscoped_staff()
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
      and r.name in ('super_admin', 'admin', 'finance')
  );
$$;

create or replace function public.is_tenant_self(p_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_lease(p_lease_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    where l.id = p_lease_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_unit(p_unit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.leases l
    join public.tenants t on t.id = l.tenant_id
    where l.unit_id = p_unit_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_property(p_property_id uuid)
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
    join public.tenants t on t.id = l.tenant_id
    where u.property_id = p_property_id
      and t.profile_id = auth.uid()
  );
$$;

create or replace function public.is_assigned_unit(p_unit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.units u
    join public.property_staff ps on ps.property_id = u.property_id
    where u.id = p_unit_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_assigned_lease(p_lease_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.leases l
    join public.property_staff ps on ps.property_id = (
      select property_id from public.units where id = l.unit_id
    )
    where l.id = p_lease_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

create or replace function public.is_assigned_tenant(p_tenant_id uuid)
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
    join public.property_staff ps on ps.property_id = u.property_id
    where l.tenant_id = p_tenant_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  ) or exists (
    select 1
    from public.rental_applications ra
    join public.units u on u.id = ra.unit_id
    join public.property_staff ps on ps.property_id = u.property_id
    where ra.tenant_id = p_tenant_id
      and ps.profile_id = auth.uid()
      and ps.is_active
  );
$$;

revoke all on function public.is_unscoped_staff() from public, anon;
revoke all on function public.is_tenant_self(uuid) from public, anon;
revoke all on function public.is_tenant_lease(uuid) from public, anon;
revoke all on function public.is_tenant_unit(uuid) from public, anon;
revoke all on function public.is_tenant_property(uuid) from public, anon;
revoke all on function public.is_assigned_unit(uuid) from public, anon;
revoke all on function public.is_assigned_lease(uuid) from public, anon;
revoke all on function public.is_assigned_tenant(uuid) from public, anon;

grant execute on function public.is_unscoped_staff() to authenticated, service_role;
grant execute on function public.is_tenant_self(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_lease(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_unit(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_property(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_unit(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_lease(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_tenant(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. RLS policies in 0015 decide visible rows.
-- ---------------------------------------------------------------------------

revoke all on public.tenants from public, anon, authenticated;
grant select, insert, update on public.tenants to authenticated;
grant all on public.tenants to service_role;

revoke all on public.rental_applications from public, anon, authenticated;
grant select, insert, update on public.rental_applications to authenticated;
grant all on public.rental_applications to service_role;

revoke all on public.leases from public, anon, authenticated;
grant select, insert, update on public.leases to authenticated;
grant all on public.leases to service_role;
