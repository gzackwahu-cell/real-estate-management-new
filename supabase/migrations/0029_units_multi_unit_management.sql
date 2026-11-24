-- Extend units for multi-unit/apartment management.
-- Safe, additive migration: preserves existing rows, RLS, and constraints.

alter table public.units
  add column if not exists floor text,
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists area_sqm numeric(10,2),
  add column if not exists amenities text[] not null default '{}'::text[],
  add column if not exists deposit_amount numeric(12,2),
  add column if not exists rent_period text not null default 'monthly',
  add column if not exists public_notes text,
  add column if not exists is_listable boolean not null default true,
  add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'units_bedrooms_check'
  ) then
    alter table public.units
      add constraint units_bedrooms_check check (bedrooms is null or bedrooms >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'units_bathrooms_check'
  ) then
    alter table public.units
      add constraint units_bathrooms_check check (bathrooms is null or bathrooms >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'units_area_sqm_check'
  ) then
    alter table public.units
      add constraint units_area_sqm_check check (area_sqm is null or area_sqm >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'units_deposit_amount_check'
  ) then
    alter table public.units
      add constraint units_deposit_amount_check check (deposit_amount is null or deposit_amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'units_rent_period_check'
  ) then
    alter table public.units
      add constraint units_rent_period_check check (rent_period in ('daily','weekly','monthly','quarterly','yearly'));
  end if;
end $$;

-- Expand unit type check to support flexible property structures.
alter table public.units drop constraint if exists units_type_check;
alter table public.units
  add constraint units_type_check check (
    unit_type in (
      'bedsitter','studio','one_bedroom','two_bedroom','three_bedroom','four_bedroom','penthouse',
      'apartment','maisonette','house','shop','office','warehouse','commercial_suite','showroom',
      'retail','mixed_use','land','custom','other'
    )
  );

create index if not exists units_property_floor_idx on public.units (property_id, floor);
create index if not exists units_property_type_idx on public.units (property_id, unit_type);
create index if not exists units_listable_idx on public.units (property_id, is_listable, occupancy_status);