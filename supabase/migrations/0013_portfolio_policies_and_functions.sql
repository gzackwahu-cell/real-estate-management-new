-- Stage 1: portfolio RLS policies and transactional mutation RPCs.
-- Local migration only. Do not run manually until approved.
--
-- All functions are SECURITY INVOKER unless explicitly noted, so Supabase RLS
-- remains the row-level boundary. The RPCs exist to keep property + owner
-- relationship writes atomic.

-- ---------------------------------------------------------------------------
-- Owners
-- ---------------------------------------------------------------------------

drop policy if exists "owners_select_staff_or_self" on public.owners;
create policy "owners_select_staff_or_self"
on public.owners for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('owners', 'view')
    and (public.is_unscoped_staff() or public.is_assigned_owner(id))
  )
  or profile_id = auth.uid()
);

drop policy if exists "owners_insert_staff" on public.owners;
create policy "owners_insert_staff"
on public.owners for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('owners', 'create')
);

drop policy if exists "owners_update_staff" on public.owners;
create policy "owners_update_staff"
on public.owners for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('owners', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_owner(id))
)
with check (
  public.is_staff_member()
  and public.has_permission('owners', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_owner(id))
);

-- Owner records are retained for history. Deactivation is the supported way to
-- stop using an owner, and no DELETE policy is granted.

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------

drop policy if exists "properties_select_scoped" on public.properties;
create policy "properties_select_scoped"
on public.properties for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('properties', 'view')
    and (public.is_unscoped_staff() or public.is_assigned_property(id))
  )
  or public.is_property_owner(id)
);

drop policy if exists "properties_insert_staff" on public.properties;
create policy "properties_insert_staff"
on public.properties for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('properties', 'create')
);

drop policy if exists "properties_update_staff" on public.properties;
create policy "properties_update_staff"
on public.properties for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_property(id))
)
with check (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_property(id))
);

drop policy if exists "properties_delete_staff" on public.properties;
create policy "properties_delete_staff"
on public.properties for delete to authenticated
using (
  public.is_staff_member()
  and public.has_permission('properties', 'delete')
  and (public.is_unscoped_staff() or public.is_assigned_property(id))
);

-- ---------------------------------------------------------------------------
-- Property owners
-- ---------------------------------------------------------------------------

drop policy if exists "property_owners_select_scoped" on public.property_owners;
create policy "property_owners_select_scoped"
on public.property_owners for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('owners', 'view')
    and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
  )
  or public.is_property_owner(property_id)
);

drop policy if exists "property_owners_insert_staff" on public.property_owners;
create policy "property_owners_insert_staff"
on public.property_owners for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and public.has_permission('owners', 'view')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

drop policy if exists "property_owners_update_staff" on public.property_owners;
create policy "property_owners_update_staff"
on public.property_owners for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and public.has_permission('owners', 'view')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
)
with check (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and public.has_permission('owners', 'view')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

drop policy if exists "property_owners_delete_staff" on public.property_owners;
create policy "property_owners_delete_staff"
on public.property_owners for delete to authenticated
using (
  public.is_staff_member()
  and public.has_permission('properties', 'edit')
  and public.has_permission('owners', 'view')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

-- ---------------------------------------------------------------------------
-- Property staff assignments
-- ---------------------------------------------------------------------------

drop policy if exists "property_staff_select_staff" on public.property_staff;
create policy "property_staff_select_staff"
on public.property_staff for select to authenticated
using (
  public.is_staff_member()
  and public.has_permission('users_roles', 'view')
  and (public.is_unscoped_staff() or profile_id = auth.uid())
);

drop policy if exists "property_staff_insert_admin" on public.property_staff;
create policy "property_staff_insert_admin"
on public.property_staff for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('users_roles', 'edit')
);

drop policy if exists "property_staff_update_admin" on public.property_staff;
create policy "property_staff_update_admin"
on public.property_staff for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('users_roles', 'edit')
)
with check (
  public.is_staff_member()
  and public.has_permission('users_roles', 'edit')
);

drop policy if exists "property_staff_delete_admin" on public.property_staff;
create policy "property_staff_delete_admin"
on public.property_staff for delete to authenticated
using (
  public.is_staff_member()
  and public.has_permission('users_roles', 'edit')
);

-- ---------------------------------------------------------------------------
-- Units
-- ---------------------------------------------------------------------------

drop policy if exists "units_select_scoped" on public.units;
create policy "units_select_scoped"
on public.units for select to authenticated
using (
  (
    public.is_staff_member()
    and public.has_permission('units', 'view')
    and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
  )
  or public.is_property_owner(property_id)
);

drop policy if exists "units_insert_staff" on public.units;
create policy "units_insert_staff"
on public.units for insert to authenticated
with check (
  public.is_staff_member()
  and public.has_permission('units', 'create')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

drop policy if exists "units_update_staff" on public.units;
create policy "units_update_staff"
on public.units for update to authenticated
using (
  public.is_staff_member()
  and public.has_permission('units', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
)
with check (
  public.is_staff_member()
  and public.has_permission('units', 'edit')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

drop policy if exists "units_delete_staff" on public.units;
create policy "units_delete_staff"
on public.units for delete to authenticated
using (
  public.is_staff_member()
  and public.has_permission('units', 'delete')
  and (public.is_unscoped_staff() or public.is_assigned_property(property_id))
);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

-- Scopes attachment writes on portfolio entity types to the same property
-- assignment boundary used by their parent rows. Other entity types are checked
-- only by their module permission because no portfolio assignment exists for them.
create or replace function public.is_attachment_entity_in_scope(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select case
    when p_entity_type = 'property' then exists (
      select 1
      from public.properties p
      where p.id = p_entity_id
        and (public.is_unscoped_staff() or public.is_assigned_property(p.id))
    )
    when p_entity_type = 'unit' then exists (
      select 1
      from public.units u
      where u.id = p_entity_id
        and (public.is_unscoped_staff() or public.is_assigned_property(u.property_id))
    )
    when p_entity_type = 'owner' then (
      (public.is_unscoped_staff() or public.is_assigned_owner(p_entity_id))
      and exists (select 1 from public.owners o where o.id = p_entity_id)
    )
    else true
  end;
$$;

revoke all on function public.is_attachment_entity_in_scope(text, uuid) from public, anon;
grant execute on function public.is_attachment_entity_in_scope(text, uuid) to authenticated, service_role;

-- There is deliberately no blanket `visibility = 'public'` clause. Anon and
-- authenticated access to public listing images is granted only by the approved
-- policy in 0022, after the listings table exists. Portfolio images remain
-- scoped to the same permission/assignment/ownership rules as their parent rows.
drop policy if exists "attachments_select_authenticated" on public.attachments;
create policy "attachments_select_authenticated"
on public.attachments for select to authenticated
using (
  (
    entity_type = 'property'
    and exists (
      select 1
      from public.properties p
      where p.id = attachments.entity_id
        and (
          (
            public.is_staff_member()
            and public.has_permission('properties', 'view')
            and (public.is_unscoped_staff() or public.is_assigned_property(p.id))
          )
          or public.is_property_owner(p.id)
        )
    )
  )
  or (
    entity_type = 'unit'
    and exists (
      select 1
      from public.units u
      where u.id = attachments.entity_id
        and (
          (
            public.is_staff_member()
            and public.has_permission('units', 'view')
            and (public.is_unscoped_staff() or public.is_assigned_property(u.property_id))
          )
          or public.is_property_owner(u.property_id)
        )
    )
  )
  or (
    entity_type = 'owner'
    and (
      (
        public.is_staff_member()
        and public.has_permission('owners', 'view')
        and (public.is_unscoped_staff() or public.is_assigned_owner(attachments.entity_id))
        and exists (select 1 from public.owners o where o.id = attachments.entity_id)
      )
      or exists (
        select 1
        from public.owners o
        where o.id = attachments.entity_id
          and o.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists "attachments_insert_staff" on public.attachments;
create policy "attachments_insert_staff"
on public.attachments for insert to authenticated
with check (
  public.is_staff_member()
  and public.is_attachment_entity_in_scope(entity_type, entity_id)
  and case
    when entity_type in ('property', 'unit') then public.has_permission('properties', 'edit')
    when entity_type = 'owner' then public.has_permission('owners', 'edit')
    when entity_type = 'listing' then public.has_permission('listings', 'edit')
    when entity_type = 'maintenance_request' then public.has_permission('maintenance', 'edit')
    when entity_type = 'lease' then public.has_permission('leases', 'edit')
    when entity_type = 'expense' then public.has_permission('expenses', 'edit')
    else false
  end
);

drop policy if exists "attachments_update_staff" on public.attachments;
create policy "attachments_update_staff"
on public.attachments for update to authenticated
using (
  public.is_staff_member()
  and public.is_attachment_entity_in_scope(entity_type, entity_id)
  and case
    when entity_type in ('property', 'unit') then public.has_permission('properties', 'edit')
    when entity_type = 'owner' then public.has_permission('owners', 'edit')
    when entity_type = 'listing' then public.has_permission('listings', 'edit')
    when entity_type = 'maintenance_request' then public.has_permission('maintenance', 'edit')
    when entity_type = 'lease' then public.has_permission('leases', 'edit')
    when entity_type = 'expense' then public.has_permission('expenses', 'edit')
    else false
  end
)
with check (
  public.is_staff_member()
  and public.is_attachment_entity_in_scope(entity_type, entity_id)
  and case
    when entity_type in ('property', 'unit') then public.has_permission('properties', 'edit')
    when entity_type = 'owner' then public.has_permission('owners', 'edit')
    when entity_type = 'listing' then public.has_permission('listings', 'edit')
    when entity_type = 'maintenance_request' then public.has_permission('maintenance', 'edit')
    when entity_type = 'lease' then public.has_permission('leases', 'edit')
    when entity_type = 'expense' then public.has_permission('expenses', 'edit')
    else false
  end
);

drop policy if exists "attachments_delete_staff" on public.attachments;
create policy "attachments_delete_staff"
on public.attachments for delete to authenticated
using (
  public.is_staff_member()
  and public.is_attachment_entity_in_scope(entity_type, entity_id)
  and case
    when entity_type in ('property', 'unit') then public.has_permission('properties', 'delete')
    when entity_type = 'owner' then public.has_permission('owners', 'delete')
    when entity_type = 'listing' then public.has_permission('listings', 'delete')
    when entity_type = 'maintenance_request' then public.has_permission('maintenance', 'delete')
    when entity_type = 'lease' then public.has_permission('leases', 'delete')
    when entity_type = 'expense' then public.has_permission('expenses', 'delete')
    else false
  end
);

-- ---------------------------------------------------------------------------
-- Atomic property + ownership writes
-- ---------------------------------------------------------------------------

create or replace function public.create_property_with_owners(
  p_title text,
  p_description text,
  p_property_type text,
  p_county text,
  p_town text,
  p_estate text,
  p_physical_address text,
  p_directions text,
  p_status text,
  p_owners jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_property_id uuid;
  v_owner jsonb;
  v_owner_id uuid;
  v_percentage numeric;
  v_status text;
  v_primary_count integer := 0;
begin
  if not public.is_staff_member()
     or not public.has_permission('properties', 'create')
     or not public.has_permission('owners', 'view') then
    raise exception 'You do not have permission to create a property.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_owners is null
     or jsonb_typeof(p_owners) <> 'array'
     or jsonb_array_length(p_owners) = 0 then
    raise exception 'Select at least one owner.'
      using errcode = 'check_violation';
  end if;

  if p_property_type not in ('residential', 'commercial', 'land', 'mixed_use') then
    raise exception 'Invalid property type.'
      using errcode = 'check_violation';
  end if;

  if p_status not in ('draft', 'active', 'maintenance', 'inactive') then
    raise exception 'Invalid property status.'
      using errcode = 'check_violation';
  end if;

  for v_owner in select value from jsonb_array_elements(p_owners)
  loop
    v_owner_id := nullif(btrim(coalesce(v_owner->>'ownerId', '')), '')::uuid;
    v_status := coalesce(v_owner->>'verificationStatus', '');
    v_percentage := nullif(btrim(coalesce(v_owner->>'percentage', '')), '')::numeric;

    if v_owner_id is null then
      raise exception 'An owner is missing a valid identifier.'
        using errcode = 'invalid_parameter_value';
    end if;

    if v_status not in ('pending', 'verified', 'rejected') then
      raise exception 'Invalid ownership verification status.'
        using errcode = 'check_violation';
    end if;

    if v_status = 'verified' and v_percentage is null then
      raise exception 'Verified owners require an ownership percentage.'
        using errcode = 'check_violation';
    end if;

    if not exists (
      select 1
      from public.owners o
      where o.id = v_owner_id
        and o.is_active
    ) then
      raise exception 'One or more selected owners are unavailable.'
        using errcode = 'check_violation';
    end if;

    if coalesce((v_owner->>'isPrimary')::boolean, false) then
      v_primary_count := v_primary_count + 1;
    end if;
  end loop;

  if v_primary_count <> 1 then
    raise exception 'Choose exactly one primary owner.'
      using errcode = 'check_violation';
  end if;

  insert into public.properties (
    title,
    description,
    property_type,
    county,
    town,
    estate,
    physical_address,
    directions,
    status,
    created_by,
    updated_by
  )
  values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_property_type,
    btrim(p_county),
    btrim(p_town),
    nullif(btrim(coalesce(p_estate, '')), ''),
    btrim(p_physical_address),
    nullif(btrim(coalesce(p_directions, '')), ''),
    p_status,
    auth.uid(),
    auth.uid()
  )
  returning id into v_property_id;

  for v_owner in select value from jsonb_array_elements(p_owners)
  loop
    insert into public.property_owners (
      property_id,
      owner_id,
      ownership_percentage,
      verification_status,
      is_primary,
      created_by,
      updated_by
    )
    values (
      v_property_id,
      nullif(btrim(coalesce(v_owner->>'ownerId', '')), '')::uuid,
      nullif(btrim(coalesce(v_owner->>'percentage', '')), '')::numeric,
      v_owner->>'verificationStatus',
      coalesce((v_owner->>'isPrimary')::boolean, false),
      auth.uid(),
      auth.uid()
    );
  end loop;

  return v_property_id;
end;
$$;

create or replace function public.update_property_with_owners(
  p_property_id uuid,
  p_title text,
  p_description text,
  p_property_type text,
  p_county text,
  p_town text,
  p_estate text,
  p_physical_address text,
  p_directions text,
  p_status text,
  p_owners jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner jsonb;
  v_owner_id uuid;
  v_percentage numeric;
  v_status text;
  v_primary_count integer := 0;
begin
  if not public.is_staff_member()
     or not public.has_permission('properties', 'edit')
     or not public.has_permission('owners', 'view') then
    raise exception 'You do not have permission to edit this property.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.properties where id = p_property_id) then
    raise exception 'Property not found.'
      using errcode = 'no_data_found';
  end if;

  if p_owners is null
     or jsonb_typeof(p_owners) <> 'array'
     or jsonb_array_length(p_owners) = 0 then
    raise exception 'Select at least one owner.'
      using errcode = 'check_violation';
  end if;

  if p_property_type not in ('residential', 'commercial', 'land', 'mixed_use') then
    raise exception 'Invalid property type.'
      using errcode = 'check_violation';
  end if;

  if p_status not in ('draft', 'active', 'maintenance', 'inactive') then
    raise exception 'Invalid property status.'
      using errcode = 'check_violation';
  end if;

  for v_owner in select value from jsonb_array_elements(p_owners)
  loop
    v_owner_id := nullif(btrim(coalesce(v_owner->>'ownerId', '')), '')::uuid;
    v_status := coalesce(v_owner->>'verificationStatus', '');
    v_percentage := nullif(btrim(coalesce(v_owner->>'percentage', '')), '')::numeric;

    if v_owner_id is null then
      raise exception 'An owner is missing a valid identifier.'
        using errcode = 'invalid_parameter_value';
    end if;

    if v_status not in ('pending', 'verified', 'rejected') then
      raise exception 'Invalid ownership verification status.'
        using errcode = 'check_violation';
    end if;

    if v_status = 'verified' and v_percentage is null then
      raise exception 'Verified owners require an ownership percentage.'
        using errcode = 'check_violation';
    end if;

    if not exists (
      select 1
      from public.owners o
      where o.id = v_owner_id
        and o.is_active
    ) then
      raise exception 'One or more selected owners are unavailable.'
        using errcode = 'check_violation';
    end if;

    if coalesce((v_owner->>'isPrimary')::boolean, false) then
      v_primary_count := v_primary_count + 1;
    end if;
  end loop;

  if v_primary_count <> 1 then
    raise exception 'Choose exactly one primary owner.'
      using errcode = 'check_violation';
  end if;

  update public.properties
  set title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      property_type = p_property_type,
      county = btrim(p_county),
      town = btrim(p_town),
      estate = nullif(btrim(coalesce(p_estate, '')), ''),
      physical_address = btrim(p_physical_address),
      directions = nullif(btrim(coalesce(p_directions, '')), ''),
      status = p_status,
      updated_by = auth.uid()
  where id = p_property_id;

  delete from public.property_owners
  where property_id = p_property_id;

  for v_owner in select value from jsonb_array_elements(p_owners)
  loop
    insert into public.property_owners (
      property_id,
      owner_id,
      ownership_percentage,
      verification_status,
      is_primary,
      created_by,
      updated_by
    )
    values (
      p_property_id,
      nullif(btrim(coalesce(v_owner->>'ownerId', '')), '')::uuid,
      nullif(btrim(coalesce(v_owner->>'percentage', '')), '')::numeric,
      v_owner->>'verificationStatus',
      coalesce((v_owner->>'isPrimary')::boolean, false),
      auth.uid(),
      auth.uid()
    );
  end loop;

  return p_property_id;
end;
$$;

revoke all on function public.create_property_with_owners(text, text, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.update_property_with_owners(uuid, text, text, text, text, text, text, text, text, text, jsonb) from public, anon;

grant execute on function public.create_property_with_owners(text, text, text, text, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.update_property_with_owners(uuid, text, text, text, text, text, text, text, text, text, jsonb) to authenticated, service_role;
