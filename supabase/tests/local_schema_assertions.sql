-- Danwell local regression assertions (catalog/schema only).
--
-- PURPOSE
--   Verify the six portfolio tables are protected by RLS, that the expected
--   policy set is installed, and that grants/helpers are correct. These checks
--   inspect PostgreSQL catalogs only: no application data is read, no Supabase
--   project is contacted, and no network access is required.
--
-- WHERE TO RUN
--   Any PostgreSQL database that has the prepared migrations applied. Run with
--   a client that stops on error, for example:
--     psql -v ON_ERROR_STOP=1 -f supabase/tests/local_schema_assertions.sql
--
--   If 0001-0024 (including 0011) have all been applied, the final blocks also
--   assert the bootstrap surface is gone and the listing publication guard is
--   installed. If you are intentionally testing a partially migrated database,
--   those blocks are skipped unless public.listings (from 0022) exists.
--
-- FAILURE BEHAVIOUR
--   Every check raises an exception with a FAIL prefix. A clean run produces no
--   FAIL lines. These assertions never modify data.

-- ---------------------------------------------------------------------------
-- 1. RLS is enabled on exactly the six portfolio tables
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_missing text := '';
begin
  foreach v_table in array array[
    'owners', 'properties', 'property_owners',
    'property_staff', 'units', 'attachments'
  ]::text[] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table
        and c.relkind = 'r'
        and c.relrowsecurity
    ) then
      v_missing := v_missing || v_table || ', ';
    end if;
  end loop;

  if v_missing <> '' then
    raise exception 'FAIL: RLS is not enabled on: %', rtrim(v_missing, ', ');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Exact expected policy set (no duplicates, no unexpected broad policies)
-- ---------------------------------------------------------------------------
-- pg_policies normally cannot contain duplicate names for one table, but this
-- comparison also catches leftover policies from older prepared migrations and
-- accidental additions from unrelated modules.
do $$
declare
  v_table text;
  v_expected text[];
  v_actual text[];
begin
  for v_table, v_expected in
    select *
    from (values
      ('owners'::text, array[
        'owners_insert_staff', 'owners_select_staff_or_self', 'owners_update_staff'
      ]::text[]),
      ('properties'::text, array[
        'properties_delete_staff', 'properties_insert_staff',
        'properties_select_scoped', 'properties_select_tenant_self',
        'properties_update_staff'
      ]::text[]),
      ('property_owners'::text, array[
        'property_owners_delete_staff', 'property_owners_insert_staff',
        'property_owners_select_scoped', 'property_owners_update_staff'
      ]::text[]),
      ('property_staff'::text, array[
        'property_staff_delete_admin', 'property_staff_insert_admin',
        'property_staff_select_staff', 'property_staff_update_admin'
      ]::text[]),
      ('units'::text, array[
        'units_delete_staff', 'units_insert_staff', 'units_select_scoped',
        'units_select_tenant_self', 'units_update_staff'
      ]::text[]),
      ('attachments'::text, array[
        'attachments_delete_staff', 'attachments_insert_staff',
        'attachments_select_authenticated', 'attachments_select_public_listings',
        'attachments_update_staff'
      ]::text[])
    ) as expected(tbl, names)
  loop
    select coalesce(array_agg(policyname order by policyname), array[]::text[])
    into v_actual
    from pg_policies
    where schemaname = 'public'
      and tablename = v_table;

    if v_actual is distinct from v_expected then
      raise exception 'FAIL: policies on %. Expected %, got %', v_table, v_expected, v_actual;
    end if;
  end loop;
end
$$;

-- No anonymous policies on private portfolio tables.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('owners', 'properties', 'property_owners', 'property_staff', 'units')
      and 'anon' = any(roles)
  ) then
    raise exception 'FAIL: an anon policy exists on a private portfolio table.';
  end if;
end
$$;

-- Attachments: anon may only use the approved public-listing SELECT policy, and
-- that policy must target both anon and authenticated.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and 'anon' = any(roles)
      and policyname <> 'attachments_select_public_listings'
  ) then
    raise exception 'FAIL: an unexpected anon policy exists on attachments.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'attachments_select_public_listings'
      and roles @> array['anon', 'authenticated']::text[]
  ) then
    raise exception 'FAIL: attachments_select_public_listings must target anon and authenticated.';
  end if;
end
$$;

-- The authenticated attachment policy must not contain the removed blanket
-- `visibility = 'public'` clause that exposed private portfolio images.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'attachments_select_authenticated'
      and qual ilike '%visibility%public%'
  ) then
    raise exception 'FAIL: blanket public visibility clause found in attachments_select_authenticated.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Grants (RLS is the row boundary; anon must still have no table privileges)
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  if to_regrole('anon') is null then
    raise notice 'Role anon is absent; skipping anon grant assertions.';
  else
    foreach v_table in array array[
      'owners', 'properties', 'property_owners', 'property_staff', 'units'
    ]::text[] loop
      if has_table_privilege('anon', 'public.' || v_table, 'SELECT')
         or has_table_privilege('anon', 'public.' || v_table, 'INSERT')
         or has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
         or has_table_privilege('anon', 'public.' || v_table, 'DELETE') then
        raise exception 'FAIL: anon has a direct privilege on private table %.', v_table;
      end if;
    end loop;

    if not has_table_privilege('anon', 'public.attachments', 'SELECT') then
      raise exception 'FAIL: anon needs SELECT on attachments for public listing images.';
    end if;
    if has_table_privilege('anon', 'public.attachments', 'INSERT')
       or has_table_privilege('anon', 'public.attachments', 'UPDATE')
       or has_table_privilege('anon', 'public.attachments', 'DELETE') then
      raise exception 'FAIL: anon has a write privilege on attachments.';
    end if;
  end if;

  if to_regrole('authenticated') is null then
    raise notice 'Role authenticated is absent; skipping authenticated grant assertions.';
  else
    foreach v_table in array array[
      'owners', 'properties', 'property_owners', 'property_staff', 'units', 'attachments'
    ]::text[] loop
      if not has_table_privilege('authenticated', 'public.' || v_table, 'SELECT') then
        raise exception 'FAIL: authenticated is missing SELECT on %.', v_table;
      end if;
    end loop;

    -- Owners are retained for history: no direct DELETE grant.
    if has_table_privilege('authenticated', 'public.owners', 'DELETE') then
      raise exception 'FAIL: authenticated must not have direct DELETE on owners.';
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Scope helpers exist and pinned-search-path SECURITY DEFINER rules hold
-- ---------------------------------------------------------------------------
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.is_unscoped_staff()',
    'public.is_staff_member()',
    'public.is_property_owner(uuid)',
    'public.is_assigned_property(uuid)',
    'public.is_assigned_owner(uuid)',
    'public.is_attachment_entity_in_scope(text, uuid)',
    'public.can_mutate_attachment_entity(text, uuid, text)',
    'public.can_read_attachment(text, uuid)',
    'public.is_approved_public_attachment(text, uuid)',
    'public.is_managed_attachment_path(text)',
    'public.attachment_path_matches(text, uuid, text)'
  ]::text[] loop
    if to_regprocedure(v_signature) is null then
      raise exception 'FAIL: missing helper %', v_signature;
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname in (
        'is_unscoped_staff', 'is_staff_member', 'is_property_owner',
        'is_assigned_property', 'is_assigned_owner', 'is_attachment_entity_in_scope',
        'can_mutate_attachment_entity', 'can_read_attachment', 'is_approved_public_attachment'
      )
      and not (
        coalesce(p.proconfig, array[]::text[])
        @> array['search_path=public, pg_temp']::text[]
      )
  ) then
    raise exception 'FAIL: a new scope helper is SECURITY DEFINER without a pinned search_path.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Super Admin protection triggers remain installed
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'protect_last_super_admin_profile'
      and not tgisinternal
  ) then
    raise exception 'FAIL: protect_last_super_admin_profile trigger is missing.';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profile_roles'::regclass
      and tgname = 'protect_super_admin_role_assignment'
      and not tgisinternal
  ) then
    raise exception 'FAIL: protect_super_admin_role_assignment trigger is missing.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Bootstrap surface removed after the full chain (0022 present)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.listings') is not null then
    if to_regprocedure('public.bootstrap_first_super_admin(text)') is not null then
      raise exception 'FAIL: bootstrap_first_super_admin(text) still exists after 0011.';
    end if;
    if to_regclass('public.super_admin_bootstrap_guard') is not null then
      raise exception 'FAIL: super_admin_bootstrap_guard still exists after 0011.';
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Storage buckets, policies and attachment path guard (0023)
-- ---------------------------------------------------------------------------
do $$
declare
  v_bucket text;
begin
  if to_regclass('storage.buckets') is null then
    raise exception 'FAIL: storage.buckets is absent; 0023 cannot be applied.';
  end if;

  foreach v_bucket in array array[
    'private-documents', 'property-private', 'public-marketing'
  ]::text[] loop
    if not exists (select 1 from storage.buckets where id = v_bucket) then
      raise exception 'FAIL: storage bucket % is missing.', v_bucket;
    end if;

    if exists (select 1 from storage.buckets where id = v_bucket and public) then
      raise exception 'FAIL: storage bucket % must never be public.', v_bucket;
    end if;

    if not exists (
      select 1
      from storage.buckets
      where id = v_bucket
        and file_size_limit = 10485760
        and coalesce(cardinality(allowed_mime_types), 0) > 0
    ) then
      raise exception 'FAIL: storage bucket % has no 10 MB MIME/size limit.', v_bucket;
    end if;
  end loop;

  if exists (
    select 1
    from storage.buckets
    where id = 'public-marketing'
      and 'application/pdf' = any(coalesce(allowed_mime_types, array[]::text[]))
  ) then
    raise exception 'FAIL: public-marketing must only allow approved image types.';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'storage.objects'::regclass and relrowsecurity
  ) then
    raise exception 'FAIL: RLS is not enabled on storage.objects.';
  end if;
end
$$;

do $$
declare
  v_expected record;
begin
  for v_expected in
    select *
    from (values
      ('storage_private_select_authorized'::text, 'SELECT'::text, array['authenticated']::text[]),
      ('storage_public_select_approved'::text, 'SELECT'::text, array['anon', 'authenticated']::text[]),
      ('storage_managed_insert'::text, 'INSERT'::text, array['authenticated']::text[]),
      ('storage_managed_delete'::text, 'DELETE'::text, array['authenticated']::text[])
    ) as expected(policyname, cmd, roles)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = v_expected.policyname
        and cmd = v_expected.cmd
        and roles @> v_expected.roles
    ) then
      raise exception 'FAIL: storage policy % is missing or has the wrong command/roles.', v_expected.policyname;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and 'anon' = any(roles)
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'FAIL: anon has a write policy on storage.objects.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and 'authenticated' = any(roles)
      and (qual ilike '%attachment%' or with_check ilike '%attachment%')
  ) then
    raise exception 'FAIL: managed objects must not be replaceable through an UPDATE policy.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.attachments'::regclass
      and tgname = 'attachments_validate_path'
      and not tgisinternal
  ) then
    raise exception 'FAIL: attachments_validate_path trigger is missing.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'attachments_select_authenticated'
      and qual ilike '%can_read_attachment%'
  ) then
    raise exception 'FAIL: attachments_select_authenticated must use can_read_attachment.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'attachments_insert_staff'
      and with_check ilike '%is_managed_attachment_path%'
      and with_check ilike '%can_mutate_attachment_entity%'
  ) then
    raise exception 'FAIL: attachment inserts must validate path and module scope.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'attachments_select_public_listings'
      and qual ilike '%is_approved_public_attachment%'
      and qual ilike '%public-marketing%'
  ) then
    raise exception 'FAIL: public attachment policy must require an approved listing and the public-marketing bucket.';
  end if;
end
$$;

do $$
begin
  if to_regrole('anon') is not null then
    if has_function_privilege('anon', 'public.can_read_attachment(text, uuid)', 'EXECUTE')
       or has_function_privilege('anon', 'public.can_mutate_attachment_entity(text, uuid, text)', 'EXECUTE')
       or has_function_privilege('anon', 'public.is_attachment_entity_in_scope(text, uuid)', 'EXECUTE') then
      raise exception 'FAIL: anon can execute a private attachment authorization helper.';
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Listing publication integrity guard (0024)
-- ---------------------------------------------------------------------------
do $$
declare
  v_expected_policies text[] := array[
    'listings_delete_staff', 'listings_insert_staff',
    'listings_select_authenticated', 'listings_select_public',
    'listings_update_staff'
  ]::text[];
  v_actual_policies text[];
begin
  if to_regclass('public.listings') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.listings'::regclass
      and tgname = 'listings_publication_guard'
      and not tgisinternal
  ) then
    raise exception 'FAIL: listings_publication_guard trigger is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_listing_publication'
      and p.prosrc ilike '%has_permission%listings%publish%'
  ) then
    raise exception 'FAIL: publication trigger must check listings:publish.';
  end if;

  select array_agg(policyname order by policyname)
  into v_actual_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'listings';

  if v_actual_policies is distinct from v_expected_policies then
    raise exception 'FAIL: unexpected listings policy set; got %, expected %.',
      v_actual_policies, v_expected_policies;
  end if;

  if to_regrole('anon') is not null then
    if has_table_privilege('anon', 'public.listings', 'INSERT')
       or has_table_privilege('anon', 'public.listings', 'UPDATE')
       or has_table_privilege('anon', 'public.listings', 'DELETE') then
      raise exception 'FAIL: anon has a write privilege on public.listings.';
    end if;

    if has_function_privilege('anon', 'public.enforce_listing_publication()', 'EXECUTE') then
      raise exception 'FAIL: anon can execute the publication trigger function.';
    end if;
  end if;
end
$$;
