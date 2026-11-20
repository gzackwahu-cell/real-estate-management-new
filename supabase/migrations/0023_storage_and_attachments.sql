-- Stage 3b: Supabase Storage buckets and hardened attachment access.
-- Prepared migration only. Do not run until approved.
--
-- Design decisions:
--   * All three managed buckets are NON-PUBLIC. There are no permanent public
--     object URLs. Approved marketing images are served through short-lived
--     signed URLs minted by the application's public image route.
--   * Browsers never choose a bucket or storage path. Every new row and object
--     must use danwell/<entity_type>/<entity_id>/<uuid>.<ext>, derived on the
--     server from the validated entity identifier and MIME type.
--   * Attachments RLS and storage.objects RLS share the same helpers, so an
--     object can only be read when its registry row is readable, and an object
--     can only be written/deleted by scoped staff with the right permission.
--   * `property-private` is an existing bucket and is reused for legacy rows;
--     new private uploads use `private-documents`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'private-documents',
    'private-documents',
    false,
    10485760,
    array[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]::text[]
  ),
  (
    'property-private',
    'property-private',
    false,
    10485760,
    array[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]::text[]
  ),
  (
    'public-marketing',
    'public-marketing',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Path helpers
-- ---------------------------------------------------------------------------

-- The application generates danwell/<entity_type>/<entity_id>/<uuid>.<ext>.
create or replace function public.is_managed_attachment_path(p_path text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    p_path is not null
    and split_part(p_path, '/', 1) = 'danwell'
    and array_length(string_to_array(p_path, '/'), 1) = 4
    and split_part(p_path, '/', 2) in (
      'property', 'unit', 'owner', 'listing', 'maintenance_request',
      'lease', 'expense'
    )
    and split_part(p_path, '/', 3) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    and split_part(p_path, '/', 4) ~ '^[0-9a-fA-F-]{36}\.[a-z0-9]{1,5}$';
$$;

create or replace function public.attachment_path_matches(
  p_entity_type text,
  p_entity_id uuid,
  p_path text
)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_entity_type is null or p_entity_id is null or p_path is null then
    return false;
  end if;
  if not public.is_managed_attachment_path(p_path) then
    return false;
  end if;
  if split_part(p_path, '/', 2) <> p_entity_type then
    return false;
  end if;
  if split_part(p_path, '/', 3)::uuid <> p_entity_id then
    return false;
  end if;
  return true;
end;
$$;

-- Safe UUID extraction for storage paths (never raises on malformed input).
create or replace function public.attachment_path_entity_id(p_path text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if not public.is_managed_attachment_path(p_path) then
    return null;
  end if;
  return split_part(p_path, '/', 3)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.is_managed_attachment_path(text) from public, anon;
revoke all on function public.attachment_path_matches(text, uuid, text) from public, anon;
revoke all on function public.attachment_path_entity_id(text) from public, anon;
grant execute on function public.is_managed_attachment_path(text) to authenticated, service_role;
grant execute on function public.attachment_path_matches(text, uuid, text) to authenticated, service_role;
grant execute on function public.attachment_path_entity_id(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Shared authorization helpers
-- ---------------------------------------------------------------------------

-- 0013's version returned true for lease/listing and other later entity types.
-- Replace it so every managed attachment is property-scoped for staff.
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
  select
    case
      when p_entity_type = 'property' then exists (
        select 1 from public.properties p
        where p.id = p_entity_id
          and (public.is_unscoped_staff() or public.is_assigned_property(p.id))
      )
      when p_entity_type = 'unit' then exists (
        select 1 from public.units u
        where u.id = p_entity_id
          and (public.is_unscoped_staff() or public.is_assigned_property(u.property_id))
      )
      when p_entity_type = 'owner' then (
        (public.is_unscoped_staff() or public.is_assigned_owner(p_entity_id))
        and exists (select 1 from public.owners o where o.id = p_entity_id)
      )
      when p_entity_type = 'lease' then exists (
        select 1 from public.leases l
        where l.id = p_entity_id
          and (public.is_unscoped_staff() or public.is_assigned_tenant(l.tenant_id))
      )
      when p_entity_type = 'listing' then exists (
        select 1 from public.listings l
        where l.id = p_entity_id
          and (
            public.is_unscoped_staff()
            or (l.property_id is not null and public.is_assigned_property(l.property_id))
          )
      )
      when p_entity_type = 'maintenance_request' then exists (
        select 1 from public.maintenance_requests mr
        where mr.id = p_entity_id
          and (public.is_unscoped_staff() or public.is_assigned_property(mr.property_id))
      )
      when p_entity_type = 'expense' then exists (
        select 1 from public.expenses e
        where e.id = p_entity_id
          and (public.is_unscoped_staff() or public.is_assigned_property(e.property_id))
      )
      else false
    end
$$;

revoke all on function public.is_attachment_entity_in_scope(text, uuid) from public, anon;
grant execute on function public.is_attachment_entity_in_scope(text, uuid) to authenticated, service_role;

-- Module/action mapping is identical to the server-side attachment actions.
create or replace function public.can_mutate_attachment_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_action text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    public.is_staff_member()
    and public.is_attachment_entity_in_scope(p_entity_type, p_entity_id)
    and case
      when p_entity_type = 'property' then public.has_permission('properties', p_action)
      when p_entity_type = 'unit' then public.has_permission('units', p_action)
      when p_entity_type = 'listing' then public.has_permission('listings', p_action)
      when p_entity_type = 'lease' then public.has_permission('leases', p_action)
      when p_entity_type = 'owner' then public.has_permission('owners', p_action)
      when p_entity_type = 'maintenance_request' then public.has_permission('maintenance', p_action)
      when p_entity_type = 'expense' then public.has_permission('expenses', p_action)
      else false
    end;
$$;

-- Read scope for authenticated users. Tenants are deliberately limited to
-- attachments on their own leases; they do not receive property documents.
create or replace function public.can_read_attachment(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    (
      p_entity_type = 'property'
      and exists (
        select 1
        from public.properties p
        where p.id = p_entity_id
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
      p_entity_type = 'unit'
      and exists (
        select 1
        from public.units u
        where u.id = p_entity_id
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
      p_entity_type = 'lease'
      and (
        (
          public.is_staff_member()
          and public.has_permission('leases', 'view')
          and exists (
            select 1 from public.leases l
            where l.id = p_entity_id and public.is_assigned_tenant(l.tenant_id)
          )
        )
        or public.is_tenant_lease(p_entity_id)
      )
    )
    or (
      p_entity_type = 'owner'
      and (
        (
          public.is_staff_member()
          and public.has_permission('owners', 'view')
          and (public.is_unscoped_staff() or public.is_assigned_owner(p_entity_id))
        )
        or exists (
          select 1 from public.owners o
          where o.id = p_entity_id and o.profile_id = auth.uid()
        )
      )
    )
    or (
      p_entity_type = 'listing'
      and public.is_staff_member()
      and public.has_permission('listings', 'view')
    )
    or (
      p_entity_type = 'maintenance_request'
      and exists (
        select 1
        from public.maintenance_requests mr
        where mr.id = p_entity_id
          and (
            (
              public.is_staff_member()
              and public.has_permission('maintenance', 'view')
              and (public.is_unscoped_staff() or public.is_assigned_property(mr.property_id))
            )
            or public.is_property_owner(mr.property_id)
          )
      )
    )
    or (
      p_entity_type = 'expense'
      and exists (
        select 1
        from public.expenses e
        where e.id = p_entity_id
          and public.is_staff_member()
          and public.has_permission('expenses', 'view')
          and (public.is_unscoped_staff() or public.is_assigned_property(e.property_id))
      )
    );
$$;

-- Approval test used by both anon SELECT policies and upload checks. Publish
-- permission is an upload-time gate, not a read-time requirement for visitors.
create or replace function public.is_approved_public_attachment(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    case
      when p_entity_type = 'listing' then exists (
        select 1
        from public.listings l
        where l.id = p_entity_id
          and l.is_published
          and l.status = 'active'
      )
      when p_entity_type = 'property' then exists (
        select 1
        from public.listings l
        where l.property_id = p_entity_id
          and l.is_published
          and l.status = 'active'
      )
      else false
    end;
$$;

revoke all on function public.can_mutate_attachment_entity(text, uuid, text) from public, anon;
revoke all on function public.can_read_attachment(text, uuid) from public, anon;
revoke all on function public.is_approved_public_attachment(text, uuid) from public, anon;
grant execute on function public.can_mutate_attachment_entity(text, uuid, text) to authenticated, service_role;
grant execute on function public.can_read_attachment(text, uuid) to authenticated, service_role;
grant execute on function public.is_approved_public_attachment(text, uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Attachment row validation trigger
-- ---------------------------------------------------------------------------

create or replace function public.validate_attachment_path()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_managed_attachment_path(new.path)
     or not public.attachment_path_matches(new.entity_type, new.entity_id, new.path) then
    raise exception 'Attachment path does not match its entity.'
      using errcode = 'check_violation';
  end if;

  if new.visibility = 'public' and new.bucket <> 'public-marketing' then
    raise exception 'Public attachments must use the public-marketing bucket.'
      using errcode = 'check_violation';
  end if;

  if new.visibility = 'private'
     and new.bucket not in ('private-documents', 'property-private') then
    raise exception 'Private attachments must use a private bucket.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists attachments_validate_path on public.attachments;
create trigger attachments_validate_path
before insert or update of path, entity_type, entity_id, bucket, visibility
on public.attachments
for each row execute function public.validate_attachment_path();

revoke all on function public.validate_attachment_path() from public, anon;
grant execute on function public.validate_attachment_path() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Replace attachment policies from 0013 and 0022
-- ---------------------------------------------------------------------------

drop policy if exists "attachments_select_authenticated" on public.attachments;
create policy "attachments_select_authenticated"
on public.attachments for select to authenticated
using (
  public.can_read_attachment(entity_type, entity_id)
);

drop policy if exists "attachments_select_public_listings" on public.attachments;
create policy "attachments_select_public_listings"
on public.attachments for select to anon, authenticated
using (
  visibility = 'public'
  and bucket = 'public-marketing'
  and public.is_approved_public_attachment(entity_type, entity_id)
);

drop policy if exists "attachments_insert_staff" on public.attachments;
create policy "attachments_insert_staff"
on public.attachments for insert to authenticated
with check (
  public.is_staff_member()
  and public.is_managed_attachment_path(path)
  and public.attachment_path_matches(entity_type, entity_id, path)
  and bucket = case when visibility = 'public' then 'public-marketing' else 'private-documents' end
  and public.can_mutate_attachment_entity(entity_type, entity_id, 'edit')
  and (
    visibility = 'private'
    or (
      visibility = 'public'
      and (public.has_permission('listings', 'publish') or public.has_permission('listings', 'approve'))
      and public.is_approved_public_attachment(entity_type, entity_id)
    )
  )
);

drop policy if exists "attachments_update_staff" on public.attachments;
create policy "attachments_update_staff"
on public.attachments for update to authenticated
using (
  public.is_staff_member()
  and public.is_managed_attachment_path(path)
  and public.attachment_path_matches(entity_type, entity_id, path)
  and public.can_mutate_attachment_entity(entity_type, entity_id, 'edit')
)
with check (
  public.is_staff_member()
  and public.is_managed_attachment_path(path)
  and public.attachment_path_matches(entity_type, entity_id, path)
  and public.can_mutate_attachment_entity(entity_type, entity_id, 'edit')
);

drop policy if exists "attachments_delete_staff" on public.attachments;
create policy "attachments_delete_staff"
on public.attachments for delete to authenticated
using (
  public.is_staff_member()
  and public.is_managed_attachment_path(path)
  and public.attachment_path_matches(entity_type, entity_id, path)
  and public.can_mutate_attachment_entity(entity_type, entity_id, 'delete')
);

-- ---------------------------------------------------------------------------
-- 6. storage.objects policies
-- ---------------------------------------------------------------------------
-- There is deliberately no UPDATE policy. Signed URLs are the only read path
-- for non-public objects, and mutations happen through the registry-backed
-- server actions.

drop policy if exists "storage_private_select_authorized" on storage.objects;
create policy "storage_private_select_authorized"
on storage.objects for select to authenticated
using (
  bucket_id in ('private-documents', 'property-private')
  and public.is_managed_attachment_path(name)
  and exists (
    select 1
    from public.attachments a
    where a.bucket = bucket_id
      and a.path = name
      and a.visibility = 'private'
      and public.can_read_attachment(a.entity_type, a.entity_id)
  )
);

drop policy if exists "storage_public_select_approved" on storage.objects;
create policy "storage_public_select_approved"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'public-marketing'
  and public.is_managed_attachment_path(name)
  and exists (
    select 1
    from public.attachments a
    where a.bucket = 'public-marketing'
      and a.path = name
      and a.visibility = 'public'
      and public.is_approved_public_attachment(a.entity_type, a.entity_id)
  )
);

drop policy if exists "storage_managed_insert" on storage.objects;
create policy "storage_managed_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('private-documents', 'public-marketing')
  and public.is_managed_attachment_path(name)
  and exists (
    select 1
    from public.attachments a
    where a.bucket = bucket_id
      and a.path = name
      and a.uploaded_by = auth.uid()
      and public.can_mutate_attachment_entity(a.entity_type, a.entity_id, 'edit')
      and (
        a.visibility = 'private'
        or (
          a.visibility = 'public'
          and a.bucket = 'public-marketing'
          and (public.has_permission('listings', 'publish') or public.has_permission('listings', 'approve'))
          and public.is_approved_public_attachment(a.entity_type, a.entity_id)
        )
      )
  )
);

-- Delete is path-based because the server action removes the registry row
-- first; an orphaned object is unreadable and this policy still permits cleanup.
drop policy if exists "storage_managed_delete" on storage.objects;
create policy "storage_managed_delete"
on storage.objects for delete to authenticated
using (
  bucket_id in ('private-documents', 'property-private', 'public-marketing')
  and public.is_managed_attachment_path(name)
  and public.can_mutate_attachment_entity(
        split_part(name, '/', 2),
        public.attachment_path_entity_id(name),
        'delete'
      )
);

-- anon keeps no insert/update/delete policy on storage.objects. No permissive
-- UPDATE policy exists for any managed bucket, so object replacement is denied.

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
-- RLS remains the row boundary. anon has SELECT on attachments only through the
-- approved public-listing policy, and no direct table privileges.

revoke all on public.attachments from public, anon;
grant select on public.attachments to anon;
grant select, insert, update, delete on public.attachments to authenticated;
grant all on public.attachments to service_role;
