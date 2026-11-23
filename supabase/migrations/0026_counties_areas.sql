-- Stage 3: Kenya location taxonomy (47 counties + editable areas).
--
-- Public visitors can read active counties/areas. Staff with settings:edit can
-- add, update or deactivate areas so clients can select a precise locality.
-- The 47 county names are fixed reference data; only areas are user-managed.

create table if not exists public.counties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  county_id uuid not null references public.counties(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists areas_county_name_key
  on public.areas (county_id, lower(name));
create index if not exists areas_county_id_idx
  on public.areas (county_id);

alter table public.counties enable row level security;
alter table public.areas enable row level security;

drop policy if exists "counties_select_public" on public.counties;
create policy "counties_select_public"
on public.counties for select to anon
using (is_active);

drop policy if exists "counties_select_authenticated" on public.counties;
create policy "counties_select_authenticated"
on public.counties for select to authenticated
using (true);

drop policy if exists "counties_write_settings" on public.counties;
create policy "counties_write_settings"
on public.counties for all to authenticated
using (has_permission('settings', 'edit'))
with check (has_permission('settings', 'edit'));

drop policy if exists "areas_select_public" on public.areas;
create policy "areas_select_public"
on public.areas for select to anon
using (is_active and exists (
  select 1 from public.counties c
  where c.id = county_id and c.is_active
));

drop policy if exists "areas_select_authenticated" on public.areas;
create policy "areas_select_authenticated"
on public.areas for select to authenticated
using (true);

drop policy if exists "areas_write_settings" on public.areas;
create policy "areas_write_settings"
on public.areas for all to authenticated
using (has_permission('settings', 'edit'))
with check (has_permission('settings', 'edit'));

grant select on public.counties, public.areas to anon, authenticated;
grant insert, update, delete on public.counties, public.areas to authenticated;

-- 47 counties with representative sample towns. These are starting options,
-- not an exhaustive locality list; staff can add more through /dashboard/locations.
with county_data(name, towns) as (
  values
    ('Mombasa', array['Mombasa Island', 'Nyali', 'Kilindini']),
    ('Kwale', array['Kwale', 'Diani', 'Matuga']),
    ('Kilifi', array['Kilifi', 'Malindi', 'Watamu']),
    ('Tana River', array['Hola', 'Garsen', 'Galole']),
    ('Lamu', array['Lamu', 'Mokowe', 'Shela']),
    ('Taita-Taveta', array['Voi', 'Wundanyi', 'Taveta']),
    ('Garissa', array['Garissa', 'Dadaab', 'Fafi']),
    ('Wajir', array['Wajir', 'Buna', 'Habaswein']),
    ('Mandera', array['Mandera', 'Elwak', 'Rhamu']),
    ('Marsabit', array['Marsabit', 'Moyale', 'Sololo']),
    ('Isiolo', array['Isiolo', 'Archer''s Post', 'Garbatulla']),
    ('Meru', array['Meru', 'Maua', 'Nkubu']),
    ('Tharaka-Nithi', array['Chuka', 'Magorombo', 'Marimanti']),
    ('Embu', array['Embu', 'Runyenjes', 'Siakago']),
    ('Kitui', array['Kitui', 'Mwingi', 'Mutomo']),
    ('Machakos', array['Machakos', 'Athi River', 'Kangundo']),
    ('Makueni', array['Wote', 'Kibwezi', 'Sultan Hamud']),
    ('Nyandarua', array['Ol Kalou', 'Nyahururu', 'Engineer']),
    ('Nyeri', array['Nyeri', 'Othaya', 'Karatina']),
    ('Kirinyaga', array['Kerugoya', 'Kutus', 'Wanguru']),
    ('Murang''a', array['Murang''a', 'Kigumo', 'Maragati']),
    ('Kiambu', array['Thika', 'Kiambu', 'Limuru']),
    ('Turkana', array['Lodwar', 'Kakuma', 'Lokichoggio']),
    ('West Pokot', array['Kapenguria', 'Kacheliba', 'Sigor']),
    ('Samburu', array['Maralal', 'Baragoi', 'Wamba']),
    ('Trans Nzoia', array['Kitale', 'Kiminini', 'Endebess']),
    ('Uasin Gishu', array['Eldoret', 'Kesses', 'Soy']),
    ('Elgeyo-Marakwet', array['Iten', 'Kapsowar', 'Marakwet']),
    ('Nandi', array['Kapsabet', 'Nandi Hills', 'Emgwen']),
    ('Baringo', array['Kabarnet', 'Eldama Ravine', 'Marigat']),
    ('Laikipia', array['Nanyuki', 'Rumuruti', 'Doldol']),
    ('Nakuru', array['Nakuru', 'Naivasha', 'Gilgil']),
    ('Narok', array['Narok', 'Kilgoris', 'Suswa']),
    ('Kajiado', array['Kajiado', 'Kitengela', 'Ngong']),
    ('Kericho', array['Kericho', 'Kipkelion', 'Sigowet']),
    ('Bomet', array['Bomet', 'Sotik', 'Mulot']),
    ('Kakamega', array['Kakamega', 'Mumias', 'Malava']),
    ('Vihiga', array['Mbale', 'Hamisi', 'Emuhaya']),
    ('Bungoma', array['Bungoma', 'Webuye', 'Kimilili']),
    ('Busia', array['Busia', 'Malaba', 'Nambale']),
    ('Siaya', array['Siaya', 'Bondo', 'Alego']),
    ('Kisumu', array['Kisumu', 'Maseno', 'Muhoroni']),
    ('Homabay', array['Homabay', 'Mbita', 'Kendu Bay']),
    ('Migori', array['Migori', 'Awendo', 'Rongo']),
    ('Kisii', array['Kisii', 'Suneka', 'Ogembo']),
    ('Nyamira', array['Nyamira', 'Keroka', 'Borabu']),
    ('Nairobi', array['Nairobi', 'Westlands', 'Kilimani', 'Eastleigh', 'Langata'])
)
insert into public.counties (name)
select cd.name
from county_data cd
where not exists (select 1 from public.counties c where c.name = cd.name)
on conflict (name) do nothing;

with county_data(name, towns) as (
  values
    ('Mombasa', array['Mombasa Island', 'Nyali', 'Kilindini']),
    ('Kwale', array['Kwale', 'Diani', 'Matuga']),
    ('Kilifi', array['Kilifi', 'Malindi', 'Watamu']),
    ('Tana River', array['Hola', 'Garsen', 'Galole']),
    ('Lamu', array['Lamu', 'Mokowe', 'Shela']),
    ('Taita-Taveta', array['Voi', 'Wundanyi', 'Taveta']),
    ('Garissa', array['Garissa', 'Dadaab', 'Fafi']),
    ('Wajir', array['Wajir', 'Buna', 'Habaswein']),
    ('Mandera', array['Mandera', 'Elwak', 'Rhamu']),
    ('Marsabit', array['Marsabit', 'Moyale', 'Sololo']),
    ('Isiolo', array['Isiolo', 'Archer''s Post', 'Garbatulla']),
    ('Meru', array['Meru', 'Maua', 'Nkubu']),
    ('Tharaka-Nithi', array['Chuka', 'Magorombo', 'Marimanti']),
    ('Embu', array['Embu', 'Runyenjes', 'Siakago']),
    ('Kitui', array['Kitui', 'Mwingi', 'Mutomo']),
    ('Machakos', array['Machakos', 'Athi River', 'Kangundo']),
    ('Makueni', array['Wote', 'Kibwezi', 'Sultan Hamud']),
    ('Nyandarua', array['Ol Kalou', 'Nyahururu', 'Engineer']),
    ('Nyeri', array['Nyeri', 'Othaya', 'Karatina']),
    ('Kirinyaga', array['Kerugoya', 'Kutus', 'Wanguru']),
    ('Murang''a', array['Murang''a', 'Kigumo', 'Maragati']),
    ('Kiambu', array['Thika', 'Kiambu', 'Limuru']),
    ('Turkana', array['Lodwar', 'Kakuma', 'Lokichoggio']),
    ('West Pokot', array['Kapenguria', 'Kacheliba', 'Sigor']),
    ('Samburu', array['Maralal', 'Baragoi', 'Wamba']),
    ('Trans Nzoia', array['Kitale', 'Kiminini', 'Endebess']),
    ('Uasin Gishu', array['Eldoret', 'Kesses', 'Soy']),
    ('Elgeyo-Marakwet', array['Iten', 'Kapsowar', 'Marakwet']),
    ('Nandi', array['Kapsabet', 'Nandi Hills', 'Emgwen']),
    ('Baringo', array['Kabarnet', 'Eldama Ravine', 'Marigat']),
    ('Laikipia', array['Nanyuki', 'Rumuruti', 'Doldol']),
    ('Nakuru', array['Nakuru', 'Naivasha', 'Gilgil']),
    ('Narok', array['Narok', 'Kilgoris', 'Suswa']),
    ('Kajiado', array['Kajiado', 'Kitengela', 'Ngong']),
    ('Kericho', array['Kericho', 'Kipkelion', 'Sigowet']),
    ('Bomet', array['Bomet', 'Sotik', 'Mulot']),
    ('Kakamega', array['Kakamega', 'Mumias', 'Malava']),
    ('Vihiga', array['Mbale', 'Hamisi', 'Emuhaya']),
    ('Bungoma', array['Bungoma', 'Webuye', 'Kimilili']),
    ('Busia', array['Busia', 'Malaba', 'Nambale']),
    ('Siaya', array['Siaya', 'Bondo', 'Alego']),
    ('Kisumu', array['Kisumu', 'Maseno', 'Muhoroni']),
    ('Homabay', array['Homabay', 'Mbita', 'Kendu Bay']),
    ('Migori', array['Migori', 'Awendo', 'Rongo']),
    ('Kisii', array['Kisii', 'Suneka', 'Ogembo']),
    ('Nyamira', array['Nyamira', 'Keroka', 'Borabu']),
    ('Nairobi', array['Nairobi', 'Westlands', 'Kilimani', 'Eastleigh', 'Langata'])
)
insert into public.areas (county_id, name)
select c.id, town.name
from county_data cd
join public.counties c on c.name = cd.name
cross join lateral unnest(cd.towns) as town(name)
where not exists (
  select 1 from public.areas a
  where a.county_id = c.id and lower(a.name) = lower(town.name)
)
on conflict do nothing;
