-- Stage 3 extension: recipients may mark their own in-app notices as read.
-- Prepared migration only. Do not run until approved.
--
-- Verified against the remote schema before writing:
--   * public.notifications has exactly one policy today:
--     notifications_select_own (SELECT, authenticated,
--     recipient_profile_id = auth.uid()).
--   * authenticated has SELECT only; it has no table-level UPDATE privilege.
--   * service_role keeps UPDATE through existing grants; this migration does not
--     alter that path.
--   * No INSERT/UPDATE/DELETE trigger exists on public.notifications.
--
-- This adds the narrow recipient write path that was missing. USING limits which
-- existing rows are visible to an UPDATE, WITH CHECK prevents reassigning a
-- notice to another profile, and the column-level grant limits client writes to
-- the two read-state fields. No other table, policy, RPC or grant is changed.

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

-- The policy above is necessary but not sufficient: 0019 granted SELECT only.
-- A column-level grant is intentionally used instead of a table-level grant so
-- clients cannot edit event_type, title, message, entity links or timestamps.
grant update (status, read_at) on public.notifications to authenticated;

-- Intentionally not added: anon INSERT/UPDATE/DELETE, an authenticated INSERT or
-- DELETE policy, or a trigger that rewrites read_at. The application/client sets
-- status and read_at together when marking a notification read.
