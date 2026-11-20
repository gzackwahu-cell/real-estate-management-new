-- Stage 3: listing publication integrity guard (W2).
-- Prepared migration only. Do not run until approved.
--
-- Depends on 0006 (has_permission), 0022 (public.listings), and 0023 (public
-- image policies). It does not replace or duplicate any listings/attachment/
-- storage policy. The public read surface remains exactly is_published AND
-- status = 'active' (0022), and approved public images remain governed by 0023.
--
-- The application publishes through setListingPublishedAction, which checks
-- listings:publish before writing. Direct PostgREST clients only needed
-- listings:edit under 0022, so a privileged state transition was possible.
-- This trigger adds the missing database-side transition guard.

create or replace function public.enforce_listing_publication()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_was_public boolean := false;
  v_is_public boolean := false;
begin
  -- Trusted administrative roles may repair data directly. Client-facing
  -- roles anon/authenticated never bypass this guard.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  v_is_public := new.is_published and new.status = 'active';

  if tg_op = 'UPDATE' then
    v_was_public := old.is_published and old.status = 'active';
  end if;

  -- A listing becomes public only when both publication flags become true.
  -- This covers direct inserts, publishing a draft, and reactivating a
  -- published-but-paused listing. Ordinary edits, pausing, unpublishing, and
  -- marking a listing let/sold/archived keep their existing workflows.
  if v_is_public and not v_was_public then
    if not public.has_permission('listings', 'publish') then
      raise exception
        'Only staff with listings:publish permission may make a listing publicly visible.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_listing_publication() from public, anon;
grant execute on function public.enforce_listing_publication() to authenticated, service_role;

drop trigger if exists listings_publication_guard on public.listings;
create trigger listings_publication_guard
before insert or update of is_published, status on public.listings
for each row execute function public.enforce_listing_publication();
