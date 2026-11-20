-- Stage 3: public listings, enquiries and viewing requests.
-- Prepared migration only. Do not run until approved.
--
-- The public site reuses properties, units and the existing attachments
-- registry. `listings` is the marketing layer required by the approved
-- blueprint; it never duplicates tenancy, owner or financial records.
-- Anonymous users can read only published, active listings and approved public
-- listing images. They can insert enquiries/viewing requests, but never select
-- or update any private enquiry record.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Public marketing listings
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  listing_type text not null default 'rent',
  property_category text not null default 'house',
  status text not null default 'draft',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  managed_by_agency boolean not null default true,
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  description text,
  county text not null,
  town text not null,
  estate text,
  physical_address text,
  bedrooms integer,
  bathrooms integer,
  price numeric(14, 2) not null default 0,
  price_period text not null default 'monthly',
  features text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_slug_key unique (slug),
  constraint listings_slug_shape_check check (
    length(btrim(slug)) > 0
    and slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint listings_title_not_blank check (length(btrim(title)) > 0),
  constraint listings_county_not_blank check (length(btrim(county)) > 0),
  constraint listings_town_not_blank check (length(btrim(town)) > 0),
  constraint listings_type_check check (listing_type in ('rent', 'sale')),
  constraint listings_category_check check (
    property_category in (
      'house', 'apartment', 'building', 'land', 'shop', 'office',
      'warehouse', 'commercial', 'other'
    )
  ),
  constraint listings_status_check check (
    status in ('draft', 'active', 'paused', 'let', 'sold', 'archived')
  ),
  constraint listings_price_period_check check (
    price_period in ('monthly', 'yearly', 'total')
  ),
  constraint listings_price_check check (price >= 0),
  constraint listings_bedrooms_check check (bedrooms is null or bedrooms between 0 and 50),
  constraint listings_bathrooms_check check (bathrooms is null or bathrooms between 0 and 50),
  constraint listings_managed_check check (
    (managed_by_agency and property_id is not null)
    or (not managed_by_agency and property_id is null and unit_id is null)
  )
);

create index if not exists listings_public_idx
on public.listings (listing_type, is_published, status, created_at desc);

create index if not exists listings_location_idx
on public.listings (county, town);

create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_featured_idx on public.listings (is_featured);
create index if not exists listings_property_idx on public.listings (property_id);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- A unit may only be advertised together with its own property.
create or replace function public.validate_listing_links()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.unit_id is not null then
    if new.property_id is null
      or not exists (
        select 1
        from public.units u
        where u.id = new.unit_id
          and u.property_id = new.property_id
      )
    then
      raise exception 'Listing unit must belong to the selected property.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_listing_links() from public, anon, authenticated;

drop trigger if exists listings_validate_links on public.listings;
create trigger listings_validate_links
before insert or update on public.listings
for each row execute function public.validate_listing_links();

-- ---------------------------------------------------------------------------
-- Website enquiries and viewing requests
-- ---------------------------------------------------------------------------

create table if not exists public.sale_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  preferred_date date,
  message text not null,
  status text not null default 'new',
  follow_up_notes text not null default '',
  source text not null default 'website',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_inquiries_name_not_blank check (length(btrim(full_name)) > 0),
  constraint sale_inquiries_phone_not_blank check (length(btrim(phone)) > 0),
  constraint sale_inquiries_email_not_blank check (length(btrim(email)) > 0),
  constraint sale_inquiries_message_not_blank check (length(btrim(message)) > 0),
  constraint sale_inquiries_status_check check (
    status in ('new', 'contacted', 'in_progress', 'closed', 'spam')
  ),
  constraint sale_inquiries_source_check check (
    source in ('website', 'whatsapp', 'phone', 'walk_in')
  ),
  constraint sale_inquiries_email_shape_check check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create index if not exists sale_inquiries_status_idx
on public.sale_inquiries (status, created_at desc);
create index if not exists sale_inquiries_listing_idx
on public.sale_inquiries (listing_id);

drop trigger if exists sale_inquiries_set_updated_at on public.sale_inquiries;
create trigger sale_inquiries_set_updated_at
before update on public.sale_inquiries
for each row execute function public.set_updated_at();

create table if not exists public.viewing_appointments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  preferred_date date,
  preferred_time text,
  message text not null,
  status text not null default 'requested',
  follow_up_notes text not null default '',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viewing_appointments_name_not_blank check (length(btrim(full_name)) > 0),
  constraint viewing_appointments_phone_not_blank check (length(btrim(phone)) > 0),
  constraint viewing_appointments_email_not_blank check (length(btrim(email)) > 0),
  constraint viewing_appointments_message_not_blank check (length(btrim(message)) > 0),
  constraint viewing_appointments_status_check check (
    status in ('requested', 'confirmed', 'completed', 'cancelled')
  ),
  constraint viewing_appointments_email_shape_check check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create index if not exists viewing_appointments_status_idx
on public.viewing_appointments (status, preferred_date);
create index if not exists viewing_appointments_listing_idx
on public.viewing_appointments (listing_id);

drop trigger if exists viewing_appointments_set_updated_at on public.viewing_appointments;
create trigger viewing_appointments_set_updated_at
before update on public.viewing_appointments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.listings enable row level security;
alter table public.sale_inquiries enable row level security;
alter table public.viewing_appointments enable row level security;

drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public"
on public.listings for select to anon
using (is_published and status = 'active');

drop policy if exists "listings_select_authenticated" on public.listings;
create policy "listings_select_authenticated"
on public.listings for select to authenticated
using (
  (is_published and status = 'active')
  or (public.is_staff_member() and public.has_permission('listings', 'view'))
);

drop policy if exists "listings_insert_staff" on public.listings;
create policy "listings_insert_staff"
on public.listings for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('listings', 'create')
);

drop policy if exists "listings_update_staff" on public.listings;
create policy "listings_update_staff"
on public.listings for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('listings', 'edit')
)
with check (
  public.is_staff_member()
  and public.has_permission('listings', 'edit')
);

drop policy if exists "listings_delete_staff" on public.listings;
create policy "listings_delete_staff"
on public.listings for delete to authenticated
using (
  public.is_staff_member()
  and public.has_permission('listings', 'delete')
);

-- Anonymous and authenticated visitors may only see approved images attached to
-- live listings. The portfolio policy in 0013 deliberately does not grant a
-- blanket public-image read, so this is the only listing-image SELECT policy.
drop policy if exists "attachments_select_public_listings" on public.attachments;
create policy "attachments_select_public_listings"
on public.attachments for select to anon, authenticated
using (
  visibility = 'public'
  and bucket = 'public-marketing'
  and entity_type = 'listing'
  and exists (
    select 1
    from public.listings l
    where l.id = attachments.entity_id
      and l.is_published
      and l.status = 'active'
  )
);

-- Insert-only for the public. Column privileges below prevent anonymous callers
-- from setting status, follow-up notes or assignment values.
drop policy if exists "sale_inquiries_insert_public" on public.sale_inquiries;
create policy "sale_inquiries_insert_public"
on public.sale_inquiries for insert to anon
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.is_published
      and l.status = 'active'
  )
  and status = 'new'
  and source = 'website'
  and coalesce(follow_up_notes, '') = ''
);

drop policy if exists "sale_inquiries_select_staff" on public.sale_inquiries;
create policy "sale_inquiries_select_staff"
on public.sale_inquiries for select to authenticated
using (
  public.is_staff_member()
  and public.has_permission('inquiries', 'view')
);

drop policy if exists "sale_inquiries_update_staff" on public.sale_inquiries;
create policy "sale_inquiries_update_staff"
on public.sale_inquiries for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('inquiries', 'edit')
)
with check (
  public.is_staff_member()
  and public.has_permission('inquiries', 'edit')
);

drop policy if exists "viewing_appointments_insert_public" on public.viewing_appointments;
create policy "viewing_appointments_insert_public"
on public.viewing_appointments for insert to anon
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.is_published
      and l.status = 'active'
  )
  and status = 'requested'
  and coalesce(follow_up_notes, '') = ''
);

drop policy if exists "viewing_appointments_select_staff" on public.viewing_appointments;
create policy "viewing_appointments_select_staff"
on public.viewing_appointments for select to authenticated
using (
  public.is_staff_member()
  and public.has_permission('viewings', 'view')
);

drop policy if exists "viewing_appointments_update_staff" on public.viewing_appointments;
create policy "viewing_appointments_update_staff"
on public.viewing_appointments for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('viewings', 'edit')
)
with check (
  public.is_staff_member()
  and public.has_permission('viewings', 'edit')
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.listings from public, anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;

revoke all on public.sale_inquiries from public, anon, authenticated;
grant insert (listing_id, full_name, phone, email, preferred_date, message)
  on public.sale_inquiries to anon;
grant select, insert, update, delete on public.sale_inquiries to authenticated;
grant all on public.sale_inquiries to service_role;

revoke all on public.viewing_appointments from public, anon, authenticated;
grant insert (listing_id, full_name, phone, email, preferred_date, preferred_time, message)
  on public.viewing_appointments to anon;
grant select, insert, update, delete on public.viewing_appointments to authenticated;
grant all on public.viewing_appointments to service_role;

-- Property managers may follow up on enquiries and viewings for their portfolio.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'property_manager'
  and p.module in ('inquiries', 'viewings')
  and p.action in ('view', 'edit')
on conflict do nothing;
