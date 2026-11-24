-- Allow anonymous visitors to read public-safe available/listable units for
-- properties that have an active published listing. Column selection is limited
-- in application queries; this policy only controls row visibility.

grant select on public.units to anon;

drop policy if exists "units_select_public_listable" on public.units;
create policy "units_select_public_listable"
on public.units
for select
to anon
using (
  is_active = true
  and is_listable = true
  and occupancy_status in ('vacant', 'reserved')
  and exists (
    select 1
    from public.listings l
    where l.property_id = units.property_id
      and l.is_published = true
      and l.status = 'active'
  )
);
