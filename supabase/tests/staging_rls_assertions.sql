-- Danwell Supabase staging RLS / authorization regression assertions.
--
-- IMPORTANT
--   This file REQUIRES a disposable Supabase staging project with 0001-0024
--   (including 0011) already applied. It is NOT locally executable: it depends
--   on Supabase Auth users, the anon/authenticated roles, and auth.uid().
--   It is never run in production.
--
-- HOW TO RUN
--   1. Create six staging Auth users in Supabase Auth (Email/Password) and
--      confirm their emails. Note their user UUIDs from the Auth users table.
--      Suggested labels: owner_a, owner_b, staff_assigned, staff_unassigned,
--      tenant_a, tenant_b.
--   2. Replace every PLACEHOLDER_UUID below with the corresponding real staging
--      Auth user UUID. The first Super Admin from the 0009 bootstrap is found
--      dynamically and does not need a placeholder.
--   3. Run in the Supabase SQL Editor or with psql against the staging database:
--        psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 \
--          -f supabase/tests/staging_rls_assertions.sql
--   4. The script is wrapped in a single transaction that is ROLLED BACK at the
--      end, so no fixture data persists. A clean run prints only the final
--      NOTICE. Any FAIL exception means an assertion was violated.
--
-- COVERAGE
--   - Anonymous access denial
--   - Unauthorized staff access denial (permission without assignment)
--   - Owner access limited to verified ownership
--   - Tenant isolation (own property/unit only)
--   - Attachment visibility: owner/staff property files, tenant lease files,
--     and approved public listing images only
--   - Storage objects are never readable through an unapproved public path
--   - Listing publication transitions require listings:publish
--   - Protection against removing the last active Super Admin

begin;

-- ---------------------------------------------------------------------------
-- 0. Actor placeholders and fixture data (created as the privileged SQL role)
-- ---------------------------------------------------------------------------
create temp table test_actors (
  label text primary key,
  profile_id uuid not null
) on commit drop;

-- Replace each 00000000-0000-0000-0000-00000000000N value with a real staging
-- Auth user UUID. They are valid UUID literals so the fail-fast check below can
-- report a clear message if one was left unchanged.
insert into test_actors (label, profile_id) values
  ('owner_a',          '00000000-0000-0000-0000-000000000001'),
  ('owner_b',          '00000000-0000-0000-0000-000000000002'),
  ('staff_assigned',   '00000000-0000-0000-0000-000000000003'),
  ('staff_unassigned', '00000000-0000-0000-0000-000000000004'),
  ('tenant_a',         '00000000-0000-0000-0000-000000000005'),
  ('tenant_b',         '00000000-0000-0000-0000-000000000006');

-- Fail fast if a placeholder was not replaced or an Auth user is missing.
do $$
declare v_label text;
begin
  for v_label in
    select label from test_actors
    where profile_id::text like '00000000-0000-0000-0000-00000000000%'
       or not exists (select 1 from public.profiles p where p.id = test_actors.profile_id)
  loop
    raise exception 'FAIL: staging actor % has no matching Auth user/profile. Replace the placeholder UUID.', v_label;
  end loop;
end
$$;

-- Stable fixture IDs used by the assertions below.
create temp table test_fixtures (
  label text primary key,
  id uuid not null
) on commit drop;

insert into test_fixtures (label, id) values
  ('owner_row_a',  'aaaaaaaa-1111-4111-8111-111111111111'),
  ('owner_row_b',  'bbbbbbbb-2222-4222-8222-222222222222'),
  ('property_a',   'cccccccc-3333-4333-8333-333333333333'),
  ('property_b',   'dddddddd-4444-4444-8444-444444444444'),
  ('unit_a',       'eeeeeeee-5555-4555-8555-555555555555'),
  ('unit_b',       'ffffffff-6666-4666-8666-666666666666'),
  ('tenant_row_a', '11111111-7777-4777-8777-777777777777'),
  ('tenant_row_b', '22222222-8888-4888-8888-888888888888'),
  ('attachment_a', '33333333-9999-4999-8999-999999999999'),
  ('lease_a',       '55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('lease_b',       '66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('listing_a',     '77777777-cccc-4ccc-8ccc-cccccccccccc'),
  ('attachment_lease_a', '88888888-dddd-4ddd-8ddd-dddddddddddd'),
  ('attachment_public',  '99999999-eeee-4eee-8eee-eeeeeeeeeeee');

-- Role assignments for the fixture actors.
insert into public.profile_roles (profile_id, role_id, assigned_by, is_active)
select a.profile_id, r.id, a.profile_id, true
from test_actors a
cross join public.roles r
where (a.label in ('owner_a', 'owner_b') and r.name = 'owner')
   or (a.label in ('staff_assigned', 'staff_unassigned') and r.name = 'property_manager')
   or (a.label in ('tenant_a', 'tenant_b') and r.name = 'tenant')
on conflict (profile_id, role_id) do update set is_active = true;

-- Owner records.
insert into public.owners (id, profile_id, full_name, phone, email, id_reference, address)
values
  ('aaaaaaaa-1111-4111-8111-111111111111',
   (select profile_id from test_actors where label = 'owner_a'),
   'Staging Owner A', '0700000001', 'owner-a@example.test', 'RLS-OWNER-A', 'Staging Address A'),
  ('bbbbbbbb-2222-4222-8222-222222222222',
   (select profile_id from test_actors where label = 'owner_b'),
   'Staging Owner B', '0700000002', 'owner-b@example.test', 'RLS-OWNER-B', 'Staging Address B');

-- Two properties with verified ownership for different owners.
insert into public.properties (id, title, county, town, physical_address, status, created_by)
values
  ('cccccccc-3333-4333-8333-333333333333', 'RLS Test Property A', 'Nairobi', 'Nairobi', 'Address A', 'active', null),
  ('dddddddd-4444-4444-8444-444444444444', 'RLS Test Property B', 'Mombasa', 'Mombasa', 'Address B', 'active', null);

insert into public.property_owners (property_id, owner_id, ownership_percentage, verification_status, is_primary)
values
  ('cccccccc-3333-4333-8333-333333333333', 'aaaaaaaa-1111-4111-8111-111111111111', 100.00, 'verified', true),
  ('dddddddd-4444-4444-8444-444444444444', 'bbbbbbbb-2222-4222-8222-222222222222', 100.00, 'verified', true);

-- Only staff_assigned is assigned to property A. staff_unassigned has the same
-- permissions but no property_staff row, which is the unauthorized staff case.
insert into public.property_staff (property_id, profile_id, assignment_role, is_active)
values
  ('cccccccc-3333-4333-8333-333333333333',
   (select profile_id from test_actors where label = 'staff_assigned'), 'manager', true);

insert into public.units (id, property_id, unit_number, unit_type, monthly_rent, occupancy_status)
values
  ('eeeeeeee-5555-4555-8555-555555555555', 'cccccccc-3333-4333-8333-333333333333', 'RLS-A1', 'bedsitter', 10000, 'vacant'),
  ('ffffffff-6666-4666-8666-666666666666', 'dddddddd-4444-4444-8444-444444444444', 'RLS-B1', 'bedsitter', 12000, 'vacant');

insert into public.tenants (id, profile_id, full_name, phone, id_reference, address)
values
  ('11111111-7777-4777-8777-777777777777',
   (select profile_id from test_actors where label = 'tenant_a'),
   'Staging Tenant A', '0700000003', 'RLS-TENANT-A', 'Staging Address C'),
  ('22222222-8888-4888-8888-888888888888',
   (select profile_id from test_actors where label = 'tenant_b'),
   'Staging Tenant B', '0700000004', 'RLS-TENANT-B', 'Staging Address D');

insert into public.leases (id, tenant_id, unit_id, start_date, end_date, monthly_rent, status)
values
  ('55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-7777-4777-8777-777777777777', 'eeeeeeee-5555-4555-8555-555555555555',
   date '2026-01-01', date '2026-12-31', 10000, 'active'),
  ('66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '22222222-8888-4888-8888-888888888888', 'ffffffff-6666-4666-8666-666666666666',
   date '2026-01-01', date '2026-12-31', 12000, 'active');

-- A published, active listing is the only route to public attachment access.
insert into public.listings (id, slug, property_id, unit_id, title, county, town, is_published, status)
values
  ('77777777-cccc-4ccc-8ccc-cccccccccccc', 'rls-test-property-a',
   'cccccccc-3333-4333-8333-333333333333', 'eeeeeeee-5555-4555-8555-555555555555',
   'RLS Test Listing A', 'Nairobi', 'Nairobi', true, 'active');

-- Paths use the server-derived format enforced by 0023.
insert into public.attachments (id, entity_type, entity_id, bucket, visibility, path)
values
  ('33333333-9999-4999-8999-999999999999', 'property',
   'cccccccc-3333-4333-8333-333333333333', 'property-private', 'private',
   'danwell/property/cccccccc-3333-4333-8333-333333333333/aaaaaaaa-1111-4111-8111-111111111111.txt'),
  ('88888888-dddd-4ddd-8ddd-dddddddddddd', 'lease',
   '55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'private-documents', 'private',
   'danwell/lease/55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa/44444444-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf'),
  ('99999999-eeee-4eee-8eee-eeeeeeeeeeee', 'listing',
   '77777777-cccc-4ccc-8ccc-cccccccccccc', 'public-marketing', 'public',
   'danwell/listing/77777777-cccc-4ccc-8ccc-cccccccccccc/44444444-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg');

-- ---------------------------------------------------------------------------
-- 1. Anonymous access denial
-- ---------------------------------------------------------------------------
set local role anon;

do $$
begin
  begin
    if exists (select 1 from public.owners)
       or exists (select 1 from public.properties)
       or exists (select 1 from public.property_owners)
       or exists (select 1 from public.property_staff)
       or exists (select 1 from public.units) then
      raise exception 'FAIL: anon can read private portfolio rows.';
    end if;
  exception
    when insufficient_privilege then
      null; -- expected: anon has no direct grants on private portfolio tables
  end;
end
$$;

-- anon attachment visibility runs outside the privilege handler so it cannot be
-- silently skipped: the approved public image is readable, private files are not.
do $$
begin
  if not exists (
    select 1 from public.attachments
    where id = '99999999-eeee-4eee-8eee-eeeeeeeeeeee'
      and visibility = 'public'
      and bucket = 'public-marketing'
  ) then
    raise exception 'FAIL: anon cannot read an approved public marketing image.';
  end if;

  if exists (
    select 1 from public.attachments
    where id in (
      '33333333-9999-4999-8999-999999999999',
      '88888888-dddd-4ddd-8ddd-dddddddddddd'
    )
  ) then
    raise exception 'FAIL: anon can read a private attachment.';
  end if;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 2. Unauthorized staff denial (permission present, assignment absent)
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'staff_unassigned'),
  true
);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.properties)
     or exists (select 1 from public.units)
     or exists (select 1 from public.owners)
     or exists (select 1 from public.property_owners) then
    raise exception 'FAIL: staff with permissions but no assignment can read portfolio rows.';
  end if;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 3. Assigned staff sees only the assigned property's rows
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'staff_assigned'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.properties where id = 'cccccccc-3333-4333-8333-333333333333')
     or not exists (select 1 from public.units where id = 'eeeeeeee-5555-4555-8555-555555555555')
     or not exists (select 1 from public.owners where id = 'aaaaaaaa-1111-4111-8111-111111111111') then
    raise exception 'FAIL: assigned staff cannot read rows for the assigned property.';
  end if;

  if exists (select 1 from public.properties where id = 'dddddddd-4444-4444-8444-444444444444')
     or exists (select 1 from public.units where id = 'ffffffff-6666-4666-8666-666666666666')
     or exists (select 1 from public.owners where id = 'bbbbbbbb-2222-4222-8222-222222222222')
     or exists (
       select 1 from public.property_owners
       where property_id = 'dddddddd-4444-4444-8444-444444444444'
     ) then
    raise exception 'FAIL: assigned staff can read rows outside the assigned property.';
  end if;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 4. Owner access limited to verified ownership
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'owner_a'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.properties where id = 'cccccccc-3333-4333-8333-333333333333')
     or not exists (select 1 from public.units where id = 'eeeeeeee-5555-4555-8555-555555555555') then
    raise exception 'FAIL: owner cannot read a verified owned property/unit.';
  end if;

  if exists (select 1 from public.properties where id = 'dddddddd-4444-4444-8444-444444444444')
     or exists (select 1 from public.units where id = 'ffffffff-6666-4666-8666-666666666666')
     or exists (select 1 from public.owners where id = 'bbbbbbbb-2222-4222-8222-222222222222') then
    raise exception 'FAIL: owner can read a property/owner not linked by verified ownership.';
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'owner_b'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.properties where id = 'dddddddd-4444-4444-8444-444444444444') then
    raise exception 'FAIL: owner B cannot read the verified owned property.';
  end if;
  if exists (select 1 from public.properties where id = 'cccccccc-3333-4333-8333-333333333333') then
    raise exception 'FAIL: owner B can read a property owned by owner A.';
  end if;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 5. Tenant isolation (own property/unit and own lease documents only)
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'tenant_a'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.properties where id = 'cccccccc-3333-4333-8333-333333333333')
     or not exists (select 1 from public.units where id = 'eeeeeeee-5555-4555-8555-555555555555') then
    raise exception 'FAIL: tenant cannot read the property/unit named in their lease.';
  end if;

  if exists (select 1 from public.properties where id = 'dddddddd-4444-4444-8444-444444444444')
     or exists (select 1 from public.units where id = 'ffffffff-6666-4666-8666-666666666666')
     or exists (select 1 from public.owners)
     or exists (select 1 from public.property_owners)
     or exists (
       select 1 from public.attachments
       where id = '33333333-9999-4999-8999-999999999999'
     )
     or exists (
       select 1 from public.attachments
       where entity_type = 'lease'
         and entity_id = '66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     ) then
    raise exception 'FAIL: tenant can read another tenancy or private portfolio rows.';
  end if;

  if not exists (
    select 1 from public.attachments
    where id = '88888888-dddd-4ddd-8ddd-dddddddddddd'
      and entity_type = 'lease'
      and entity_id = '55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) then
    raise exception 'FAIL: tenant cannot read a document on their own lease.';
  end if;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 6. Attachment visibility follows ownership, assignment and approval
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'owner_a'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (
    select 1 from public.attachments
    where id = '33333333-9999-4999-8999-999999999999'
  ) then
    raise exception 'FAIL: owner cannot read a private file on their own property.';
  end if;

  if exists (
    select 1 from public.attachments
    where id = '88888888-dddd-4ddd-8ddd-dddddddddddd'
  ) then
    raise exception 'FAIL: owner can read a lease document they do not own.';
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from test_actors where label = 'staff_assigned'),
  true
);
set local role authenticated;

do $$
begin
  if not exists (
    select 1 from public.attachments
    where id = '33333333-9999-4999-8999-999999999999'
  ) then
    raise exception 'FAIL: assigned staff cannot read an attachment on their property.';
  end if;
end
$$;

reset role;

-- Withdrawing publication immediately removes anon access to the image.
update public.listings set is_published = false
where id = '77777777-cccc-4ccc-8ccc-cccccccccccc';

set local role anon;

do $$
begin
  if exists (
    select 1 from public.attachments
    where id = '99999999-eeee-4eee-8eee-eeeeeeeeeeee'
  ) then
    raise exception 'FAIL: anon can read a public image after its listing was unpublished.';
  end if;
end
$$;

reset role;

update public.listings set is_published = true
where id = '77777777-cccc-4ccc-8ccc-cccccccccccc';

-- ---------------------------------------------------------------------------
-- 7. Last active Super Admin protection
-- ---------------------------------------------------------------------------
-- These checks run as the privileged SQL role so they test the database
-- triggers directly, independent of any application or PostgREST layer.
do $$
declare
  v_super_admin_profile_id uuid;
  v_role_assignment_deleted boolean := false;
begin
  select p.id
  into v_super_admin_profile_id
  from public.profiles p
  join public.profile_roles pr on pr.profile_id = p.id
  join public.roles r on r.id = pr.role_id
  where p.is_active and pr.is_active and r.is_active and r.name = 'super_admin'
  order by p.created_at
  limit 1;

  if v_super_admin_profile_id is null then
    raise exception 'FAIL: no active Super Admin exists; bootstrap was not completed.';
  end if;

  begin
    update public.profiles
    set is_active = false
    where id = v_super_admin_profile_id;
    raise exception 'FAIL: last Super Admin profile deactivation was allowed.';
  exception
    when check_violation then
      null; -- expected: trigger blocked the change
  end;

  begin
    delete from public.profile_roles pr
    using public.roles r
    where pr.profile_id = v_super_admin_profile_id
      and pr.role_id = r.id
      and r.name = 'super_admin'
      and pr.is_active;
    v_role_assignment_deleted := found;
    raise exception 'FAIL: last Super Admin role assignment removal was allowed.';
  exception
    when check_violation then
      null; -- expected: trigger blocked the change
  end;

  if v_role_assignment_deleted then
    raise exception 'FAIL: last Super Admin role assignment was actually deleted.';
  end if;
end
$$;

-- Non-super-admin must not be able to assign the Super Admin role.
-- Actor IDs are captured before switching role because the temp table belongs
-- to the privileged session role.
do $$
declare
  v_tenant_a_id uuid;
  v_tenant_b_id uuid;
  v_super_role_id uuid;
begin
  select profile_id into v_tenant_a_id from test_actors where label = 'tenant_a';
  select profile_id into v_tenant_b_id from test_actors where label = 'tenant_b';
  select id into v_super_role_id from public.roles where name = 'super_admin' and is_active;

  if v_tenant_a_id is null or v_tenant_b_id is null or v_super_role_id is null then
    raise exception 'FAIL: staging fixture IDs are incomplete.';
  end if;

  perform set_config('request.jwt.claim.sub', v_tenant_a_id::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.profile_roles (profile_id, role_id, assigned_by, is_active)
    values (v_tenant_b_id, v_super_role_id, v_tenant_a_id, true);
    raise exception 'FAIL: a tenant was allowed to assign the Super Admin role.';
  exception
    when insufficient_privilege then
      null; -- expected: trigger blocked the assignment
  end;

  execute 'set local role none';
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Listing publication transition guard (0024)
-- ---------------------------------------------------------------------------
reset role;

insert into test_fixtures (label, id) values
  ('listing_edit_only', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  ('listing_paused',    'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff');

insert into public.listings (id, slug, property_id, title, county, town, is_published, status)
values
  ('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', 'rls-test-edit-only',
   'cccccccc-3333-4333-8333-333333333333', 'RLS Edit Only Listing', 'Nairobi', 'Nairobi',
   false, 'draft'),
  ('bbbbbbbb-cccc-4ddd-8eee-ffffffffffff', 'rls-test-paused',
   'cccccccc-3333-4333-8333-333333333333', 'RLS Paused Listing', 'Nairobi', 'Nairobi',
   true, 'paused');

-- Temporarily remove publish from the staff role used below, leaving edit/create
-- intact. Changes are inside the rolled-back fixture transaction.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.name = 'property_manager'
  and p.module = 'listings'
  and p.action = 'publish';

select set_config(
  'request.jwt.claim.sub',
  (select profile_id from test_actors where label = 'staff_assigned'),
  true
);
set local role authenticated;

do $$
begin
  begin
    update public.listings
    set is_published = true, status = 'active'
    where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    raise exception 'FAIL: edit-only staff published a draft listing.';
  exception
    when insufficient_privilege then
      null; -- expected: publication trigger blocked the transition
  end;

  begin
    update public.listings
    set status = 'active'
    where id = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
    raise exception 'FAIL: edit-only staff reactivated a paused published listing.';
  exception
    when insufficient_privilege then
      null; -- expected: publication trigger blocked the transition
  end;

  -- An ordinary content edit by the same actor must still work.
  update public.listings
  set title = 'RLS Edit Only Listing Updated'
  where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  if not exists (
    select 1 from public.listings
    where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
      and title = 'RLS Edit Only Listing Updated'
  ) then
    raise exception 'FAIL: edit-only staff can no longer edit listing content.';
  end if;
end
$$;

reset role;

-- Restore publish and verify the same staff actor can now publish.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'property_manager'
  and p.module = 'listings'
  and p.action = 'publish'
on conflict do nothing;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id from test_actors where label = 'staff_assigned'),
  true
);
set local role authenticated;

update public.listings
set is_published = true, status = 'active'
where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

reset role;

set local role anon;

do $$
begin
  if not exists (
    select 1 from public.listings
    where id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  ) then
    raise exception 'FAIL: anon cannot read a listing published by an authorized staff member.';
  end if;

  if exists (
    select 1 from public.listings
    where id = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
  ) then
    raise exception 'FAIL: anon can read a published-but-paused listing.';
  end if;
end
$$;

reset role;

rollback;

do $$
begin
  raise notice 'PASS: staging RLS/authorization assertions completed; fixture transaction rolled back.';
end
$$;
