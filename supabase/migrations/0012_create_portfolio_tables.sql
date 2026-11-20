-- Stage 1: property portfolio foundation.
-- Local migration only. Do not run manually until approved.
--
-- Introduces owners, properties, property_owners, property_staff, units and the
-- generic attachments registry. Access rules and transactional RPCs live in
-- 0013_portfolio_policies_and_functions.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Owners
-- ---------------------------------------------------------------------------

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  id_reference text not null,
  address text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owners_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint owners_phone_not_blank check (length(btrim(phone)) > 0),
  constraint owners_id_reference_not_blank check (length(btrim(id_reference)) > 0),
  constraint owners_address_not_blank check (length(btrim(address)) > 0),
  constraint owners_email_shape_check check (
    email is null
    or email = ''
    or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint owners_id_reference_key unique (id_reference)
);

create index if not exists owners_active_idx
on public.owners (is_active);

create index if not exists owners_profile_idx
on public.owners (profile_id)
where profile_id is not null;

drop trigger if exists owners_set_updated_at on public.owners;
create trigger owners_set_updated_at
before update on public.owners
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  property_type text not null default 'residential',
  county text not null,
  town text not null,
  estate text,
  physical_address text not null,
  directions text,
  status text not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_title_not_blank check (length(btrim(title)) > 0),
  constraint properties_county_not_blank check (length(btrim(county)) > 0),
  constraint properties_town_not_blank check (length(btrim(town)) > 0),
  constraint properties_address_not_blank check (length(btrim(physical_address)) > 0),
  constraint properties_type_check check (
    property_type in ('residential', 'commercial', 'land', 'mixed_use')
  ),
  constraint properties_status_check check (
    status in ('draft', 'active', 'maintenance', 'inactive')
  )
);

create index if not exists properties_type_idx on public.properties (property_type);
create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_location_idx
on public.properties (county, town);

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Property owners (supports co-owners and pending verification)
-- ---------------------------------------------------------------------------

create table if not exists public.property_owners (
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  ownership_percentage numeric(5, 2),
  verification_status text not null default 'pending',
  is_primary boolean not null default false,
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, owner_id),
  constraint property_owners_percentage_range_check check (
    ownership_percentage is null
    or (ownership_percentage > 0 and ownership_percentage <= 100)
  ),
  constraint property_owners_verification_check check (
    verification_status in ('pending', 'verified', 'rejected')
  ),
  constraint property_owners_verified_percentage_check check (
    verification_status <> 'verified'
    or ownership_percentage is not null
  ),
  constraint property_owners_date_range_check check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create unique index if not exists property_owners_primary_idx
on public.property_owners (property_id)
where is_primary;

create index if not exists property_owners_owner_idx
on public.property_owners (owner_id);

create index if not exists property_owners_verification_idx
on public.property_owners (verification_status);

drop trigger if exists property_owners_set_updated_at on public.property_owners;
create trigger property_owners_set_updated_at
before update on public.property_owners
for each row execute function public.set_updated_at();

-- Only verified ownership rows count toward the approved 100% total. Pending
-- and rejected rows may omit ownership_percentage. The check is deferred so a
-- transaction can replace a complete ownership set in several statements.
create or replace function public.enforce_verified_ownership_total()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_property_id uuid;
  v_has_verified boolean;
  v_total numeric;
begin
  if tg_op = 'DELETE' then
    v_property_id := old.property_id;
  else
    v_property_id := new.property_id;
  end if;

  select exists (
    select 1
    from public.property_owners
    where property_id = v_property_id
      and verification_status = 'verified'
  )
  into v_has_verified;

  if not v_has_verified then
    return null;
  end if;

  select sum(ownership_percentage)
  into v_total
  from public.property_owners
  where property_id = v_property_id
    and verification_status = 'verified';

  if v_total is distinct from 100 then
    raise exception 'Verified ownership percentages for a property must total 100.'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_verified_ownership_total() from public, anon, authenticated, service_role;

drop trigger if exists property_owners_verified_total on public.property_owners;
create constraint trigger property_owners_verified_total
after insert or update or delete on public.property_owners
deferrable initially deferred
for each row execute function public.enforce_verified_ownership_total();

-- ---------------------------------------------------------------------------
-- Property staff assignments (foundation for property-scoped RLS)
-- ---------------------------------------------------------------------------

create table if not exists public.property_staff (
  property_id uuid not null references public.properties(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'viewer',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, profile_id),
  constraint property_staff_role_check check (
    assignment_role in ('manager', 'caretaker', 'agent', 'viewer')
  )
);

create index if not exists property_staff_profile_idx
on public.property_staff (profile_id, is_active);

drop trigger if exists property_staff_set_updated_at on public.property_staff;
create trigger property_staff_set_updated_at
before update on public.property_staff
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Units
-- ---------------------------------------------------------------------------

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_number text not null,
  unit_type text not null,
  monthly_rent numeric(12, 2) not null default 0,
  deposit_required boolean not null default true,
  occupancy_status text not null default 'vacant',
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_unit_number_not_blank check (length(btrim(unit_number)) > 0),
  constraint units_property_number_key unique (property_id, unit_number),
  constraint units_type_check check (
    unit_type in (
      'bedsitter', 'studio', 'one_bedroom', 'two_bedroom', 'three_bedroom',
      'apartment', 'maisonette', 'shop', 'office', 'custom'
    )
  ),
  constraint units_occupancy_check check (
    occupancy_status in ('vacant', 'occupied', 'reserved', 'maintenance')
  ),
  constraint units_monthly_rent_check check (monthly_rent >= 0)
);

create index if not exists units_property_idx on public.units (property_id);
create index if not exists units_occupancy_idx on public.units (occupancy_status);
create index if not exists units_active_idx on public.units (is_active);

drop trigger if exists units_set_updated_at on public.units;
create trigger units_set_updated_at
before update on public.units
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Attachments registry for private/public storage separation
-- ---------------------------------------------------------------------------

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  bucket text not null,
  visibility text not null,
  path text not null,
  caption text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attachments_entity_type_check check (
    entity_type in (
      'property', 'unit', 'owner', 'listing', 'maintenance_request',
      'lease', 'expense'
    )
  ),
  constraint attachments_visibility_check check (
    visibility in ('private', 'public')
  ),
  constraint attachments_bucket_check check (
    (visibility = 'private' and bucket in ('private-documents', 'property-private'))
    or (visibility = 'public' and bucket = 'public-marketing')
  ),
  constraint attachments_path_not_blank check (length(btrim(path)) > 0)
);

create index if not exists attachments_entity_idx
on public.attachments (entity_type, entity_id);

create index if not exists attachments_visibility_idx
on public.attachments (visibility);

create unique index if not exists attachments_primary_idx
on public.attachments (entity_type, entity_id)
where is_primary;

drop trigger if exists attachments_set_updated_at on public.attachments;
create trigger attachments_set_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Portfolio policies are installed in 0013. RLS must be enabled here so those
-- policies are effective from the moment the prepared migration chain is
-- applied. The grants below intentionally remain broad; RLS is the row boundary.
alter table public.owners enable row level security;
alter table public.properties enable row level security;
alter table public.property_owners enable row level security;
alter table public.property_staff enable row level security;
alter table public.units enable row level security;
alter table public.attachments enable row level security;

-- ---------------------------------------------------------------------------
-- Scoped-access helpers used by RLS and application queries
-- ---------------------------------------------------------------------------

-- Unscoped staff (Super Admin, Admin, Finance) may see all portfolio rows.
-- This is defined here because portfolio RLS in 0013 needs it. 0014 recreates
-- the identical helper for the tenancy module; the definitions are idempotent.
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

-- Staff module permissions must not leak private portfolio data through the
-- broad module grants already given to the tenant and owner portal roles.
create or replace function public.is_staff_member()
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
      and r.name in (
        'super_admin', 'admin', 'finance', 'property_manager',
        'caretaker', 'field_agent'
      )
  );
$$;

-- Owners only see properties linked to an active, verified ownership row.
create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.property_owners po
    join public.owners o on o.id = po.owner_id
    where po.property_id = p_property_id
      and po.verification_status = 'verified'
      and o.is_active
      and o.profile_id = auth.uid()
  );
$$;

create or replace function public.is_assigned_property(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.property_staff ps
    join public.profiles p on p.id = ps.profile_id
    where ps.property_id = p_property_id
      and ps.is_active
      and p.is_active
      and ps.profile_id = auth.uid()
  );
$$;

-- An owner is in scope for a property-assigned staff member when at least one
-- verified ownership link points to a property that staff member is assigned to.
create or replace function public.is_assigned_owner(p_owner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.property_owners po
    where po.owner_id = p_owner_id
      and public.is_assigned_property(po.property_id)
  );
$$;

revoke all on function public.is_unscoped_staff() from public, anon;
revoke all on function public.is_staff_member() from public, anon;
revoke all on function public.is_property_owner(uuid) from public, anon;
revoke all on function public.is_assigned_property(uuid) from public, anon;
revoke all on function public.is_assigned_owner(uuid) from public, anon;

grant execute on function public.is_unscoped_staff() to authenticated, service_role;
grant execute on function public.is_staff_member() to authenticated, service_role;
grant execute on function public.is_property_owner(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_property(uuid) to authenticated, service_role;
grant execute on function public.is_assigned_owner(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privileges. RLS policies in 0013 decide which rows each role may access.
-- ---------------------------------------------------------------------------

revoke all on public.owners from public, anon, authenticated;
grant select, insert, update on public.owners to authenticated;
grant all on public.owners to service_role;

revoke all on public.properties from public, anon, authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;

revoke all on public.property_owners from public, anon, authenticated;
grant select, insert, update, delete on public.property_owners to authenticated;
grant all on public.property_owners to service_role;

revoke all on public.property_staff from public, anon, authenticated;
grant select, insert, update, delete on public.property_staff to authenticated;
grant all on public.property_staff to service_role;

revoke all on public.units from public, anon, authenticated;
grant select, insert, update, delete on public.units to authenticated;
grant all on public.units to service_role;

revoke all on public.attachments from public, anon, authenticated;
-- Anon SELECT is required for the approved public-listing image policy in 0022.
-- RLS restricts it to published active listing images; no private rows are visible.
grant select on public.attachments to anon;
grant select, insert, update, delete on public.attachments to authenticated;
grant all on public.attachments to service_role;
