-- Stage 1: one-time, restricted first Super Admin bootstrap.
-- Local migration only. Do not run manually until approved.
--
-- Manual procedure after approval:
--   1. Create the person as a Supabase Auth user in the Dashboard.
--   2. Confirm that user's email address is verified (email_confirmed_at is set).
--   3. In the SQL Editor, run:
--        select public.bootstrap_first_super_admin('admin@example.com');
--   4. Confirm one active Super Admin exists, then apply 0011_remove_bootstrap.sql.
--
-- The function is revoked from anon and authenticated. It cannot be called by
-- anonymous visitors or ordinary signed-in users. It refuses to run if an
-- active Super Admin already exists, and requires a verified Auth email.
-- The one-time guard row is set only inside a protected subtransaction and is
-- cleared after both success and failure.

create or replace function public.bootstrap_first_super_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_role_id uuid;
  v_full_name text;
begin
  if p_email is null or length(btrim(p_email)) = 0 then
    raise exception 'An email address is required.'
      using errcode = 'invalid_parameter_value';
  end if;

  if btrim(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Serialize with all other operations that can change the Super Admin count.
  perform public.lock_super_admin_registry();

  if public.active_super_admin_count() > 0 then
    raise exception 'An active Super Admin already exists. Bootstrap is one-time only.'
      using errcode = 'check_violation';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  order by u.created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'No Supabase Auth user exists for that email. Create the user first.'
      using errcode = 'invalid_parameter_value';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = v_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception 'The Supabase Auth email must be verified before bootstrap.'
      using errcode = 'check_violation';
  end if;

  select id
  into v_role_id
  from public.roles
  where name = 'super_admin'
    and is_active
  limit 1;

  if v_role_id is null then
    raise exception 'The super_admin role is missing or inactive.'
      using errcode = 'check_violation';
  end if;

  select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), 'Danwell Administrator')
  into v_full_name
  from auth.users u
  where u.id = v_user_id;

  -- The guard lets the protected profile_roles trigger accept this one controlled
  -- write. It is set inside a subtransaction: an error rolls it back and the
  -- exception handler also clears it explicitly.
  begin
    update public.super_admin_bootstrap_guard
    set allowed = true
    where singleton;

    insert into public.profiles (id, email, full_name, is_active)
    values (v_user_id, lower(btrim(p_email)), v_full_name, true)
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_active = true,
        updated_at = now()
    returning id into v_profile_id;

    insert into public.profile_roles (profile_id, role_id, assigned_by, is_active)
    values (v_profile_id, v_role_id, v_profile_id, true)
    on conflict (profile_id, role_id) do update
    set is_active = true,
        assigned_by = excluded.assigned_by;

    update public.super_admin_bootstrap_guard
    set allowed = false
    where singleton;
  exception when others then
    update public.super_admin_bootstrap_guard
    set allowed = false
    where singleton;
    raise;
  end;

  return v_profile_id;
end;
$$;

revoke all on function public.bootstrap_first_super_admin(text) from public;
revoke all on function public.bootstrap_first_super_admin(text) from anon, authenticated;
grant execute on function public.bootstrap_first_super_admin(text) to service_role;
