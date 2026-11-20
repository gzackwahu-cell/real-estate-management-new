# Danwell Database Integration Readiness Audit and Launch Checklist

**Audit date:** 2026-11-19  
**Scope:** local source tree only. No Supabase connection was made, no SQL or migration was executed, no `.env.local` value was displayed, and no deploy/commit/push was performed. The approved blueprint and the old Real Estate project were not touched.

## 0. Overall status

**Status: NOT READY TO LAUNCH until staging verification passes.** Blockers B1 and B2 and warnings W1-W5 have been fixed locally in prepared migrations, application code, and deployment documentation. Remaining work is staging/deployment configuration and verification: apply the migrations in the documented order (now including `0024`), complete the manual first-Super-Admin gate, set real environment values in the hosting platform, configure the shared production rate limiter, and run the SQL regression assertions. No Supabase connection, SQL execution, deploy, commit, or push was performed while making these fixes.

| ID | Severity | Status |
| --- | --- | --- |
| B1 | ~~Blocker~~ **Fixed locally** | RLS is now enabled on all six portfolio tables in `0012`; scoped staff/owner policies, attachment scoping, and the anon grant are corrected in `0013`/`0022`/`0023`. Must be verified in staging. |
| B2 | ~~Blocker~~ **Fixed locally** | `0011` now fails closed unless the guard is closed, an active Super Admin exists, and a confirmed-email active profile/role assignment is present. Exact staging sequence is documented in `0011` and section 4 below. Must be verified in staging. |
| W1 | ~~Warning~~ **Fixed locally** | `0023_storage_and_attachments.sql` creates/updates all three non-public buckets, the `storage.objects` policies, path helpers, and the attachment path trigger. Must be verified in staging. |
| W2 | ~~Warning~~ **Fixed locally** | `0024_listing_publication_guard.sql` adds a database trigger requiring `listings:publish` whenever a listing transitions into public visibility (`is_published AND status = 'active'`). It closes direct PostgREST publication/reactivation without changing `0022` policies or public read rules. Must be verified in staging. |
| W3 | ~~Warning~~ **Fixed locally** | Public enquiry/viewing limits now use shared Upstash Redis state via `lib/listings/rate-limit-core.ts`. Production requires both Upstash REST variables and denies requests on missing config or provider failure; a development-only in-memory fallback remains outside production. Must be configured and verified in staging. |
| W4 | ~~Warning~~ **Fixed locally** | Reusable upload/list/delete components and server actions now back property, unit, lease, and listing attachments. Public marketing images are served through short-lived signed URLs. Must be verified in staging. |
| W5 | ~~Warning~~ **Fixed locally** | `.env.example` and `README.md` now document every application-supplied variable with placeholders and clear required/optional status, including `NEXT_PUBLIC_SITE_URL` and both Upstash REST variables. The confirmed-unused `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_STORAGE_BUCKET` entries were removed. Platform-managed `NODE_ENV`/`VERCEL_ENV` are documented as not set manually. Real staging/production values still must be configured and verified. |

No missing application table or RPC reference was found. All application database references map to objects created by the prepared migrations.

---

## 1. Migration inventory and execution order

There are **23 migration files**. Numbering runs `0001`-`0009` and `0011`-`0024`. `0010` is absent; no source file references `0010`, so the gap is harmless. No duplicate migration numbers or duplicate file names were found.

| Order | File | Purpose | Gate / note |
| --- | --- | --- | --- |
| 1 | `0001_create_roles.sql` | `pgcrypto`, `set_updated_at()`, `roles`, RLS | Foundation |
| 2 | `0002_create_permissions.sql` | `permissions`, RLS | Foundation |
| 3 | `0003_create_profiles.sql` | `profiles`, `handle_new_auth_user()` trigger on `auth.users`, RLS | Requires ability to create a trigger on `auth.users` |
| 4 | `0004_create_role_permissions.sql` | `role_permissions`, RLS | Foundation |
| 5 | `0005_create_profile_roles.sql` | `profile_roles`, RLS | Foundation |
| 6 | `0006_security_functions_and_policies.sql` | `lock_super_admin_registry()`, `is_super_admin()`, `has_permission()`, `is_profile_active()`, `get_my_active_role_names()`, `set_profile_active()`, and RLS on stage-1 tables | Foundation |
| 7 | `0007_seed_roles_and_permissions.sql` | 8 built-in roles, 126 permissions, starter grants | Upserts built-in roles/permissions |
| 8 | `0008_super_admin_protection.sql` | `super_admin_bootstrap_guard`, `active_super_admin_count()`, last-admin protection triggers, system-role protection | Foundation |
| 9 | `0009_bootstrap_first_super_admin.sql` | `bootstrap_first_super_admin(text)`, service-role-only execute | **Manual gate follows** |
| — | **Manual bootstrap** | Create and verify Auth user; call bootstrap RPC; sign in; verify `/dashboard`; confirm active Super Admin count | Required before `0011` |
| 10 | `0011_remove_bootstrap.sql` | Drops guard table and bootstrap function after replacing the trigger | **Conditional; fails closed unless first Super Admin verified** |
| 11 | `0012_create_portfolio_tables.sql` | `owners`, `properties`, `property_owners`, `property_staff`, `units`, `attachments`, RLS enablement, scope helpers, grants | B1 fixed locally |
| 12 | `0013_portfolio_policies_and_functions.sql` | Scoped portfolio RLS policies; attachment scope helper; `create_property_with_owners()`, `update_property_with_owners()` | B1 fixed locally |
| 13 | `0014_create_tenancy_tables.sql` | `btree_gist`, `tenants`, `rental_applications`, `leases`, overlap exclusion, occupancy sync, tenant/assignment helpers, grants | Depends on `0012` |
| 14 | `0015_tenancy_policies_and_functions.sql` | Enables RLS on tenancy tables; tenancy policies; tenant self-access on `units`/`properties`; `review_rental_application()`, `create_lease()`, `update_lease()` | Depends on `0012`; portfolio RLS now in place |
| 15 | `0016_create_financial_tables.sql` | Adds `leases.deposit_amount`; 11 finance tables; `receipt_number_seq`; integrity triggers; scoped finance helpers; grants | Contains a top-level data `UPDATE` |
| 16 | `0017_financial_policies_and_functions.sql` | Enables RLS on finance tables; finance policies; 12 finance RPCs; grants | Depends on `0016` |
| 17 | `0018_create_maintenance_tables.sql` | `maintenance_requests`, `maintenance_assignments`, `maintenance_progress_updates`, `expenses`, `notifications`, validation triggers, maintenance helpers, grants | Depends on `0012`, `0014` |
| 18 | `0019_maintenance_policies_and_functions.sql` | Enables RLS on maintenance tables; policies; 9 maintenance RPCs; grants | Depends on `0018` |
| 19 | `0020_maintenance_role_grants.sql` | Additive maintenance/property/tenant permissions for caretaker, field_agent, finance | Depends on `0007` |
| 20 | `0021_owner_portal_policies.sql` | Owner maintenance policies; `is_owner_maintenance_request()`, `owner_tenant_overview()`, `owner_finance_summary()`, `owner_financial_statement()` | Depends on `0012`, `0014`, `0016`, `0017`, `0018`, `0019` |
| 21 | `0022_public_website_listings.sql` | `listings`, `sale_inquiries`, `viewing_appointments`; public/staff RLS; `validate_listing_links()`; grants; extra property-manager permissions | Depends on `0001`, `0007`, `0012`, `0013` |
| 22 | `0023_storage_and_attachments.sql` | Three non-public storage buckets with 10 MB/MIME limits; server-derived path helpers and trigger; hardened `is_attachment_entity_in_scope()`; shared read/mutate/public-approval helpers; attachment and `storage.objects` policies; grants | W1/W4 fixed locally; apply after `0022` |
| 23 | `0024_listing_publication_guard.sql` | `enforce_listing_publication()` trigger requiring `listings:publish` on transitions into public visibility; no policy changes | W2 fixed locally; **apply last**, after `0023` |

### Dependency findings

- No migration references a table or function created by a later migration. `0012:280-285` includes the text value `'listing'` in the `attachments.entity_type` check before `listings` exists in `0022`; this is a label, not a foreign-key dependency, and is safe.
- `0011` is the only ordering gate that fails closed. It requires the manual bootstrap from `0009`, a closed guard, a confirmed Auth email, an active profile, and an active Super Admin role assignment. The interactive sign-in/dashboard check is a manual staging gate recorded in the `0011` header.
- `0016:15-18` updates existing `leases.deposit_amount` from `monthly_rent` where a deposit is required. This is harmless on a fresh database but is a real data change on an existing one.
- `0014:7` requires `btree_gist`; `0001`, `0016`, `0022`, and `0023` require `pgcrypto`. Both use `create extension if not exists`.
- `0023` must be applied after `0022` because it references `public.listings` in `is_approved_public_attachment()` and replaces the attachment policies created by `0013`/`0022`. It depends on the Supabase `storage` schema (`storage.buckets`, `storage.objects`) being present, which is standard on hosted Supabase.
- `0024` must be applied after `0022` because it installs a trigger on `public.listings` and calls `has_permission('listings', 'publish')`. It does not replace any policy and leaves the public SELECT/attachment/storage rules from `0022`/`0023` intact.

### Destructive or irreversible operations

- `0011:113-115` drops `super_admin_bootstrap_guard` and `bootstrap_first_super_admin(text)`. This is intentional and irreversible without replaying earlier setup; apply only after the first Super Admin is confirmed.
- `0007:14-17` upserts built-in roles and reactivates them on replay.
- `0016:12-23` adds a column, updates existing rows, then adds a check constraint.
- `0013`, `0015`, `0017`, `0019`, `0021`, `0022`, `0023`, and `0024` drop and recreate policies/triggers/functions of the same name; these are idempotent replacements, not broad data deletion. `0023` also upserts the three storage bucket rows (forcing `public = false` and the 10 MB/MIME limits) and replaces `is_attachment_entity_in_scope()`.
- No top-level `TRUNCATE` or broad table delete exists. `DELETE` statements at `0013:580`, `0017:997`, `0017:1146` are inside controlled relationship/finance RPCs.

---

## 2. Database readiness

### RLS coverage

Enabled:

- Stage 1: `roles`, `permissions`, `profiles`, `role_permissions`, `profile_roles`, `super_admin_bootstrap_guard` (until dropped by `0011`).
- Portfolio (**B1 fixed in `0012`**): `owners`, `properties`, `property_owners`, `property_staff`, `units`, `attachments`.
- Tenancy: `tenants`, `rental_applications`, `leases` (`0015:9-11`).
- Finance: `payment_methods`, `rent_charges`, `payments`, `payment_allocations`, `allocation_adjustments`, `payment_reversals`, `deposits`, `deposit_transactions`, `receipts`, `mpesa_transactions`, `audit_log` (`0017:8-18`).
- Maintenance: `maintenance_requests`, `maintenance_assignments`, `maintenance_progress_updates`, `expenses`, `notifications` (`0019:9-13`).
- Public website: `listings`, `sale_inquiries`, `viewing_appointments` (`0022:207-209`).
- Storage (**W1 fixed in `0023`**): RLS enabled on `storage.objects`; access is governed by `storage_private_select_authorized`, `storage_public_select_approved`, `storage_managed_insert`, and `storage_managed_delete` — all of which check the corresponding `attachments` row. There is deliberately no `UPDATE` policy.

Portfolio policy review (after the fix):

- `owners`: SELECT for staff with `owners:view` **and** unscoped or assigned-owner scope, or the owner's own profile; INSERT/UPDATE for staff with the matching permission and scope. No DELETE policy; records are deactivated instead.
- `properties`: SELECT for staff with `properties:view` and unscoped/assigned scope, or verified owners; INSERT/UPDATE/DELETE for staff with matching permission and assignment scope.
- `property_owners`: SELECT/INSERT/UPDATE/DELETE require `owners:view` plus `properties:edit`, with unscoped or assigned-property scope; owners may read links to their verified properties.
- `property_staff`: SELECT only for staff with `users_roles:view` and unscoped scope or the row's own `profile_id`; writes require `users_roles:edit`.
- `units`: SELECT for staff with `units:view` and unscoped/assigned scope, verified owners, or tenants named in an active lease; writes require matching permission and assignment scope.
- `attachments`: no blanket `visibility = 'public'` read. Authenticated SELECT uses `can_read_attachment()` (staff assignment/permission, verified ownership, or tenant's own lease for `lease` rows). The anon/authenticated `attachments_select_public_listings` policy requires `visibility = 'public'`, `bucket = 'public-marketing'`, and `is_approved_public_attachment()` — a published, active listing for the row's `listing`, or a published active listing linked to the row's `property`. Writes use `can_mutate_attachment_entity()` plus `is_attachment_entity_in_scope()` (hardened in `0023` to cover property/unit/owner/lease/listing/maintenance/expense) and the server-derived path helpers. A `attachments_validate_path` trigger rejects any path that does not match its entity or bucket/visibility.
- Anonymous: no table grants on the five private portfolio tables; only `SELECT` on `attachments` for the approved public-listing policy.
- Shared helper `is_unscoped_staff()` is defined in `0012` (portfolio RLS) and identically recreated in `0014` (tenancy RLS). `is_assigned_owner()`, `is_attachment_entity_in_scope()` (hardened in `0023`), `can_read_attachment()`, `can_mutate_attachment_entity()`, and `is_approved_public_attachment()` are scoped helpers. All are `SECURITY DEFINER` with pinned `search_path` and restricted grants (the private helpers are not executable by `anon`).

Consequences of the original B1 are resolved; the public listing image path now depends on `attachments` RLS as intended. Private attachment files are never publicly readable, and public marketing files are readable only while approved.

### Grants and permissions

- Stage-1 helper grants are restricted appropriately. `active_super_admin_count()` is revoked even from `service_role` (`0008:41`); `bootstrap_first_super_admin(text)` is granted only to `service_role` (`0009:125`).
- Portfolio grants are broad at the table level for `authenticated` and rely on RLS as the row boundary; this is now correct because RLS is enabled in `0012`. `anon` has no grants on the five private portfolio tables and only `SELECT` on `attachments`, which is restricted by the approved public-listing policy in `0022`/`0023`.
- `0023` revokes all `anon`/`public` privileges on `attachments` and the private attachment authorization helpers, grants `SELECT` to `anon` (bounded by RLS), and grants execute on `is_approved_public_attachment()` to `anon`/`authenticated`. On `storage.objects`, the only anon policy is an approved-image `SELECT`; anon has no insert/update/delete policy and no object REPLACE path exists.
- Tenancy grants are `SELECT/INSERT/UPDATE` to `authenticated`, with no direct delete (`0014:461-471`).
- Finance grants are `SELECT` only to `authenticated`; all writes go through SECURITY DEFINER RPCs (`0016:676-720`).
- Maintenance grants are `SELECT` only to `authenticated`; writes go through RPCs (`0018:350-368`).
- Public grants are correctly split:
  - `anon` may `SELECT` published listings and insert only the allowed columns on `sale_inquiries`/`viewing_appointments` (`0022:346-360`).
  - `anon` has no `SELECT` on enquiries or viewings.
- `STAFF_ROLES` in `lib/auth/roles.ts:49-56` excludes `owner` and `tenant`; RLS helpers use explicit staff-role checks. This is consistent with `0021`.

### SECURITY DEFINER functions

All `SECURITY DEFINER` declarations reviewed have a pinned `set search_path = ...`. This includes the four definer helpers in `0023` (`is_attachment_entity_in_scope`, `can_mutate_attachment_entity`, `can_read_attachment`, `is_approved_public_attachment`); the additional `0023` path helpers are `IMMUTABLE`, and `validate_attachment_path()` is a non-definer trigger function, all with pinned search paths. The scan found no function missing a search path; the only raw matches without a nearby clause were comments. Non-definer helper `public.set_updated_at()` in `0001` is a trigger function and does not need elevation.

### Financial and receipt protections

- Payments cannot be deleted or updated once recorded (`0016:325-350`); corrections use reversal records.
- Payment tenant/lease agreement is enforced by trigger (`0016:292-322`).
- Allocations cannot exceed the effective payment or charge (`0016:353-449`).
- Deposit transactions must match the deposit and payment type (`0016:451-499`).
- Reversals require a reason, positive amount, and cannot exceed the remaining payment (`0017:1057-1126`).
- Reallocations remove/adjust prior allocations and append adjustment rows (`0017:997-999`, `1146-1148`).
- `receipts.payment_id` is unique (`0016:246`), and `issue_receipt_for_payment()` is idempotent (`0017:530-574`).
- `issue_receipt()` requires `payments:edit` plus assignment scope (`0017:577-600`).
- `audit_log` is readable only by unscoped staff with `reports:view` (`0017:186-194`).
- Lease anti-overlap uses a GiST exclusion constraint in `0014`, and one approved application can create at most one lease via `0015:15-17`.

### Owner and tenant isolation

- Owner finance and tenant overview RPCs are `SECURITY DEFINER`, pinned-search-path, and guard every row with `is_property_owner()` (`0021:88-307`). They return aggregates/curated fields only.
- Owners are not granted direct finance table access (`0016`; `0021` adds RPCs only).
- Tenant reads are tied to `is_tenant_self`, `is_tenant_lease`, `is_tenant_charge/payment/deposit/receipt`, and related helpers (`0015`, `0016`, `0017`).
- The tenant receipt detail page additionally verifies `receipt.payments.tenant_id === portal.tenant.id`, providing an application-level second boundary.

### Public listing isolation

- Anonymous reads are limited to `is_published AND status = 'active'` (`0022:211-214`).
- Anonymous enquiry/viewing inserts require an active published listing, fixed status/source defaults, and empty follow-up notes (`0022:271-320`).
- Anonymous cannot set status, source, follow-up notes, or assignment values because of column-level grants (`0022:351-360`).
- Public attachment isolation is enforced by RLS on `attachments` plus the single `attachments_select_public_listings` policy targeting `anon, authenticated`. It requires `visibility = 'public'`, `bucket = 'public-marketing'`, and an approved row: `entity_type = 'listing'` on a published active listing, or `entity_type = 'property'` linked to a published active listing (`0023`). Public images are served by `/api/public-images/[attachmentId]` as short-lived signed URLs; the bucket itself stays non-public.
- Publication state transitions are guarded by `0024`: moving a listing into `is_published AND status = 'active'` requires `listings:publish`. Ordinary content edits, pausing, unpublishing, and marking a listing let/sold/archived keep their existing workflows. The guard is deliberately not a `check (not is_published or status <> 'active')`, which would break the existing pause workflow.
- `/sitemap.xml` is generated at request time under Cache Components: `app/sitemap.ts` calls `await connection()` before any database access. The query selects only `slug`, `updated_at`, and `created_at` from published active listings through the anonymous client, then maps them to `/properties/<slug>` plus the existing static pages. No private properties, tenant data, or protected application routes are included.

### Storage bucket requirements (W1 fixed in `0023`)

`0023_storage_and_attachments.sql` creates/updates all three buckets and their policies. All buckets are **non-public** — there are no permanent public object URLs:

| Bucket | Public | MIME / size limit | Used for |
| --- | --- | --- | --- |
| `public-marketing` | **No** | Images only (`image/jpeg`, `image/png`, `image/webp`), 10 MB | Approved listing/property images, served via short-lived signed URLs from `/api/public-images/[attachmentId]` |
| `private-documents` | No | Documents and images, 10 MB | New private owner/tenant/lease/unit/property uploads (`lib/portfolio/constants.ts`) |
| `property-private` | No | Documents and images, 10 MB | Existing legacy private property rows; reused, not duplicated |

Key controls in `0023`:

- Browsers never choose a bucket or path. The server derives `danwell/<entity_type>/<entity_id>/<uuid>.<ext>` from the validated entity id and MIME type; a trigger rejects any path that does not match its row.
- Every new row/object must use that managed path. `property-private` remains readable for legacy private rows but new private uploads use `private-documents`.
- Public visibility requires `visibility = 'public'`, `bucket = 'public-marketing'`, an approved published active listing relationship, and (at upload time) `listings:publish` or `listings:approve`.
- `storage.objects` SELECT checks the corresponding `attachments` row through the same RLS helpers; there is no anon write policy and no object `UPDATE` (replace) policy.

Required policies and verification are listed in the launch checklist below.

### Supabase/PostgreSQL compatibility

- Features used are standard on hosted Supabase Postgres: `pgcrypto`, `btree_gist`, RLS, policies targeting `anon`/`authenticated`, `pg_advisory_xact_lock`, partial/unique indexes, exclusion constraints, `SECURITY DEFINER`, and `create trigger` on `auth.users`.
- `0003` creates a trigger on `auth.users`; the applying role needs the normal Supabase migrations/postgres privileges.
- No database version-specific syntax was found. Live compatibility was not tested because no connection was permitted.

### Supabase CLI / project configuration

- `supabase/` contains `migrations/` and `tests/` (prepared, not executed SQL assertions). There is no `supabase/config.toml`.
- `supabase` is not on `PATH`; no `node_modules/.bin/supabase` shim exists.
- `package.json` has no Supabase or migration script.
- Apply via the Supabase SQL Editor in the order above, or install/link the Supabase CLI before using `supabase db push`.

### Environment status

- An earlier presence-only audit found `.env.local` with the two public Supabase variables populated and `NEXT_PUBLIC_SITE_URL` absent. Local resolution now falls back to `http://localhost:3000`; deployed builds fail fast with an actionable error if the variable is missing or empty. No environment values were displayed, and no documentation task inspected or modified `.env.local`.
- Actual application input variables are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`. `NODE_ENV` and `VERCEL_ENV` are read by the rate limiter but are platform-managed.
- No application file reads `SUPABASE_SERVICE_ROLE_KEY`. No application file reads `NEXT_PUBLIC_STORAGE_BUCKET`; bucket names are hardcoded in `lib/portfolio/constants.ts` and `lib/listings/constants.ts`. Both obsolete entries were removed from `.env.example` and `README.md` after that code scan.

---

## 3. Application integration

### Table and RPC references

All application references map to prepared migrations:

- Auth/RBAC: `profiles`, `roles`, `permissions`, `role_permissions`, `profile_roles`; RPCs `is_profile_active`, `has_permission`, `get_my_active_role_names`.
- Portfolio: `owners`, `properties`, `property_owners`, `units`, `attachments`; RPCs `create_property_with_owners`, `update_property_with_owners`.
- Tenancy: `tenants`, `rental_applications`, `leases`; RPCs `review_rental_application`, `create_lease`, `update_lease`.
- Finance: `payment_methods`, `rent_charges`, `payments`, `payment_allocations`, `allocation_adjustments`, `payment_reversals`, `deposits`, `deposit_transactions`, `receipts`, `audit_log`; RPCs `generate_rent_charges`, `adjust_rent_charge`, `record_payment`, `allocate_payment`, `reallocate_payment`, `reverse_payment`, `create_deposit_for_lease`, `record_deposit_transaction`, `issue_receipt`.
- Maintenance: `maintenance_requests`, `maintenance_assignments`, `maintenance_progress_updates`, `expenses`, `notifications`; RPCs `list_maintenance_staff`, `create_maintenance_request`, `assign_maintenance_request`, `update_maintenance_status`, `add_maintenance_note`, `record_maintenance_expense`, `update_maintenance_expense`.
- Owner portal: RPCs `owner_tenant_overview`, `owner_finance_summary`, `owner_financial_statement`.
- Public website: `listings`, `sale_inquiries`, `viewing_appointments`; storage buckets `public-marketing`, `private-documents`, `property-private`.
- Attachments: shared components (`attachment-manager`, `attachment-list`) and server actions in `lib/portfolio/attachment-actions.ts` / `attachment-queries.ts`; approved public images via `GET /api/public-images/[attachmentId]`.

No application page references a missing table or RPC once `0022`, `0023`, and `0024` are applied.

### Supabase client configuration

- `lib/supabase/client.ts`: browser client using public env only.
- `lib/supabase/server.ts`: cookie-based server client using public env only; `getAuthorizedServerClient()` requires a branded DAL context.
- `lib/supabase/proxy.ts`: refreshes/validates the session and calls `is_profile_active`.
- `lib/listings/supabase.ts`: anonymous-only client with no cookie persistence, used for all public reads and form inserts.
- No service-role key is used anywhere in the application code.

### Runtime readiness after migrations

- Public homepage, rentals, sales, filters, details, enquiry, and viewing flows will work after `0022`. Before `0022`, public listing queries catch errors and render empty states.
- Staff listing/enquiry/viewing management requires `0022`.
- Owner portal requires `0021` for finance/tenant overview helpers and complete maintenance visibility.
- Tenant portal requires `0014`-`0019` for leases, charges, payments, receipts, and maintenance.
- Portals and public attachment isolation are safe only after the prepared migrations are applied in staging and the RLS regression assertions pass.
- `proxy.ts` protects `/dashboard`, `/owner`, `/tenant`; DAL/guards provide the real authorization boundary.
- Attachment management is available to staff on property, unit, lease, and listing detail pages, and read-only on the owner property page and tenant lease cards. Public galleries on `/properties/[slug]` render only approved images. These features require `0023` and must be verified in staging.

### Storage uploads (W4 fixed locally)

Reusable attachment UI and server-side upload/delete are implemented:

- `components/portfolio/attachment-manager.tsx` (staff upload/list/delete) and `components/portfolio/attachment-list.tsx` (read-only signed links) back property, unit, lease, and listing attachments.
- `lib/portfolio/attachment-actions.ts` performs server-side permission checks, derives the bucket/path from the entity id and validated MIME type, enforces a 10 MB limit, and revalidates affected pages. The browser never supplies a bucket or storage path.
- `lib/portfolio/attachment-queries.ts` loads rows through RLS and mints short-lived signed view URLs for authorized users; `app/api/public-images/[attachmentId]/route.ts` mints signed redirect URLs for approved public images only, with no-store caching.
- Public images use `unoptimized` images so the optimizer does not cache expired signed URLs. `next.config.ts` sets `experimental.serverActions.bodySizeLimit = "12mb"` to allow the 10 MB uploads.
- Tenants may read lease attachments on their own leases only; they receive no property-document access. Owner access is read-only on their own properties.

---

## 4. Launch checklist

### A. Pre-flight fixes

- [x] **B1 fixed locally:** `0012` enables RLS on `owners`, `properties`, `property_owners`, `property_staff`, `units`, and `attachments`; `0013`/`0022`/`0023` correct policies and anon access. No forward migration is needed because nothing has been applied yet.
- [x] **B2 fixed locally:** `0011` fails closed unless the guard is closed, an active Super Admin exists, and a confirmed-email active profile/role assignment is present. The exact staging sequence is documented in the `0011` header and in section B below.
- [x] **W1 fixed locally:** `0023` creates the three non-public buckets, the `storage.objects` policies, path helpers, and the attachment path trigger. Verify in staging.
- [x] **W2 fixed locally:** `0024` blocks edit-only staff from publishing or reactivating public listings through direct PostgREST updates. The existing `0022`/`0023` read policies, attachment checks, and storage policies are unchanged.
- [x] **W3 fixed locally:** public enquiry/viewing limits now use shared Upstash Redis fixed windows. Production fails closed on missing configuration or provider failure; the in-memory fallback is development-only and documented. Configure and verify in staging.
- [x] **W4 fixed locally:** reusable upload/list/delete UI and server actions, plus signed public image delivery, are implemented and integrated into staff/owner/tenant/public pages. Verify in staging.
- [x] **W5 fixed locally:** `.env.example` and `README.md` now distinguish required and optional variables, include `NEXT_PUBLIC_SITE_URL` and both Upstash REST variables with placeholders only, and no longer list the two confirmed-unused variables. Real staging/production values remain a deployment task.

### B. Exact staging sequence for bootstrap and `0011`

1. On a fresh staging project, apply `0001` through `0009` in filename order. **Stop at `0009`.**
2. Create the first Super Admin account manually:
   - Create the user in Supabase Auth (Email / Password) and confirm the email (`email_confirmed_at` is set).
   - In the SQL Editor run `select public.bootstrap_first_super_admin('<verified-admin-email>');`.
   - The function refuses to run unless the email is confirmed and no active Super Admin exists. It creates an active profile and an active `super_admin` role assignment.
3. Verify the first Super Admin end to end:
   - Sign in as that user in staging and confirm `/dashboard` loads and `get_my_active_role_names()` includes `super_admin`. This interactive check is a manual release gate; the database cannot assert a successful browser login.
   - Run the `0011` pre-flight query in the `0011_remove_bootstrap.sql` header. Require `guard_present = true`, `guard_allowed = false`, `active_super_admins >= 1`, and `verified_super_admins >= 1`.
4. Only then apply `0011_remove_bootstrap.sql`. Its DO block repeats all four database checks and raises before any destructive change. If applied early, it must fail closed.
5. Apply `0012_create_portfolio_tables.sql`, then `0013` through `0022` in filename order, then `0023_storage_and_attachments.sql`, and finally `0024_listing_publication_guard.sql` (must be last; it installs the listing publication trigger).
6. Run `supabase/tests/local_schema_assertions.sql` (catalog, Storage, and publication-guard checks) and `supabase/tests/staging_rls_assertions.sql` (Auth/RLS/attachment/publication-transition checks), then the smoke tests in section G.

Do not apply `0011` before step 3. Do not treat the numeric gap at `0010` as a missing file. Do not weaken the replacement trigger in `0011`: it still requires an existing Super Admin for new assignments, holds the advisory lock, and blocks removal of the last active Super Admin.

### C. Required Supabase project configuration

- [ ] Hosted Supabase project with Postgres,PostgREST, Auth, and Storage enabled.
- [ ] `public` schema exposed through PostgREST.
- [ ] Database migrations role able to create extensions, triggers on `auth.users`, policies, and grants.
- [ ] Auth provider: **Email / Password**.
- [ ] Email confirmation enabled; public sign-up disabled (accounts are created by authorized staff/Super Admin).
- [ ] Site URL and redirect URLs configured for the production domain and any preview/local domains used.
- [ ] Password policy enabled; generic login errors remain in the application.
- [ ] HTTPS enforced on the production domain.
- [ ] RLS enabled on every application table (see smoke test).
- [ ] Service-role key stored only in Supabase/server-side secret storage; never used by browser code.

### D. Environment variables

Required in all environments:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL; validated by `lib/supabase/env.ts`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key; RLS is the data boundary.
- `NEXT_PUBLIC_SITE_URL` — absolute site origin with no trailing slash; used by metadata, canonical URLs, sitemap, robots and sharing links.

Required in production and hosted staging (shared public-form rate limiting):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Both Upstash values are optional only for local development, where leaving both
blank enables the development-only in-memory fallback. A partial configuration
fails closed. `NODE_ENV` and `VERCEL_ENV` are platform-managed and must not be
set manually.

Confirmed unused by application code and removed from `.env.example` and
`README.md`:

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STORAGE_BUCKET`

No values are recorded in this checklist. Do not prefix any secret with `NEXT_PUBLIC_`.

### D1. Shared public-form rate limiting configuration (W3)

- `lib/listings/rate-limit.ts` is the server-only entry point; the testable implementation is `lib/listings/rate-limit-core.ts`.
- Both Upstash REST variables must be set in production and on Vercel. A partial configuration fails closed.
- The limiter uses one shared fixed window per `(limit, windowMs)` rule with the existing rules of 5 enquiries and 3 viewing requests per 10 minutes per client identifier.
- The Upstash SDK timeout is disabled (`timeout: 0`) so provider errors can be caught. A provider error, SDK timeout response, or missing production configuration denies the form submission with the existing error-message shape.
- When both Upstash variables are absent and neither `NODE_ENV` nor `VERCEL_ENV` is `production`, an in-memory fallback is used for local development only. It is never used in production. Both production-detection values are platform-managed.
- Unit tests cover allowed requests, limit exceeded, provider failure, SDK timeout responses, missing/partial production configuration, and the development fallback.

### E. Storage buckets and access policies

`0023` creates/updates these buckets. All are **non-public**; never flip `public` to true:

| Bucket | Public | MIME / size limits |
| --- | --- | --- |
| `public-marketing` | No | `image/jpeg`, `image/png`, `image/webp`; 10 MB |
| `private-documents` | No | JPEG/PNG/WebP, PDF, DOC, DOCX, TXT; 10 MB |
| `property-private` | No | JPEG/PNG/WebP, PDF, DOC, DOCX, TXT; 10 MB |

`storage.objects` policies installed by `0023` (verify all in staging):

- `storage_public_select_approved` (`anon`, `authenticated`, SELECT): object in `public-marketing` with a managed path and an `attachments` row where `visibility = 'public'`, `bucket = 'public-marketing'`, and `is_approved_public_attachment()` is true (published active listing, or property linked to one).
- `storage_private_select_authorized` (`authenticated`, SELECT): object in `private-documents`/`property-private` with a managed path and a private `attachments` row authorized by `can_read_attachment()`.
- `storage_managed_insert` (`authenticated`, INSERT): object in `private-documents`/`public-marketing` with a managed path matching an `attachments` row uploaded by the caller, with module permission and (for public) publish/approve rights and an approved listing.
- `storage_managed_delete` (`authenticated`, DELETE): managed path with `can_mutate_attachment_entity(..., 'delete')`.
- No `UPDATE` policy (objects cannot be replaced), and no anon write policy on any bucket.

Application behaviour: public images are served only through `/api/public-images/[attachmentId]`, which checks approval and returns a short-lived signed redirect with no-store caching. Private files are exposed only to authorized users via signed view URLs. Uploads/renames/deletes always go through the server actions; do not grant clients direct bucket/path choice.

### F. First Super Admin bootstrap

Follow the exact gate in section B. Do not leave `super_admin_bootstrap_guard` or `bootstrap_first_super_admin()` in place after the first Super Admin is confirmed unless there is a deliberate recovery plan. After `0011`, further Super Admins must be assigned by an existing Super Admin.

### G. SQL regression assertions and database smoke tests

Two executable SQL assertion files were added. They do not connect to Supabase or execute anything from this working tree; they are prepared for staging.

| File | Where executable | What it verifies |
| --- | --- | --- |
| `supabase/tests/local_schema_assertions.sql` | Any PostgreSQL with the prepared migrations applied (no Supabase Auth, no network) | RLS enabled on the six portfolio tables and `storage.objects`; exact policy set with no duplicates or anon policies on private tables; grant boundaries; scope/path helpers exist with pinned search paths; attachment path trigger installed; bucket public/size/MIME settings and storage policy roles/commands; anon write denials; Super Admin protection triggers installed; bootstrap surface gone after `0022`; listing publication trigger/function and unchanged listings policy set from `0024`. |
| `supabase/tests/staging_rls_assertions.sql` | Disposable Supabase staging project only, after `0001`-`0024` and a completed bootstrap | Anonymous denial; unauthorized staff denial; assigned-staff scope; owner verified-ownership scope; tenant isolation (own lease documents only); attachment visibility for owner/staff/tenant; approved public image readable by anon and revocable on unpublish; private files never anon-readable; edit-only staff cannot publish or reactivate a listing while authorized staff can; anon sees only published active listings; last-active-Super-Admin protection. Fixtures are created inside a transaction that is rolled back. Replace the placeholder Auth user UUIDs before running. |

Run the smoke tests below in staging immediately after migrations. Expected result is stated for each.

1. `select count(*) from public.roles;` → `8`.
2. `select count(*) from public.permissions;` → `126`.
3. `select public.active_super_admin_count();` → `1`.
4. `select count(*) from pg_proc where pronamespace='public'::regnamespace and proname='bootstrap_first_super_admin';` → `0` after `0011`.
5. RLS coverage:
   ```sql
   select c.relname
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in (
       'roles','permissions','profiles','role_permissions','profile_roles',
       'owners','properties','property_owners','property_staff','units','attachments',
       'tenants','rental_applications','leases',
       'payment_methods','rent_charges','payments','payment_allocations',
       'allocation_adjustments','payment_reversals','deposits','deposit_transactions',
       'receipts','mpesa_transactions','audit_log',
       'maintenance_requests','maintenance_assignments','maintenance_progress_updates',
       'expenses','notifications','listings','sale_inquiries','viewing_appointments'
     )
     and not c.relrowsecurity;
   ```
   → **0 rows** (the six portfolio tables are included and must pass).
6. Required RPCs exist: `has_permission`, `is_profile_active`, `get_my_active_role_names`, `create_property_with_owners`, `update_property_with_owners`, `review_rental_application`, `create_lease`, `update_lease`, `generate_rent_charges`, `record_payment`, `allocate_payment`, `reallocate_payment`, `reverse_payment`, `create_deposit_for_lease`, `record_deposit_transaction`, `issue_receipt`, `create_maintenance_request`, `assign_maintenance_request`, `update_maintenance_status`, `add_maintenance_note`, `record_maintenance_expense`, `update_maintenance_expense`, `list_maintenance_staff`, `owner_tenant_overview`, `owner_finance_summary`, `owner_financial_statement`.
7. As `anon`: `select * from public.listings;` → only published active rows.
8. As `anon`: `select * from public.sale_inquiries;` and `select * from public.viewing_appointments;` → permission denied / zero rows.
9. As `anon`: `select * from public.attachments;` → only approved public marketing rows (published active listings / properties linked to one); no private rows.
10. As an authenticated non-staff user: attempt a direct `UPDATE` on `public.properties` → denied by RLS.
11. Owner isolation: two owner profiles/properties; `owner_finance_summary(null)` returns only verified owned properties for each caller.
12. Tenant isolation: two tenants; each sees only own lease, charges, payments, deposits, and receipts.
13. Finance protections: duplicate receipt insert for one payment fails; over-allocation fails; payment update/delete fails; reversal above remaining amount fails.
14. Storage: all three buckets are non-public with the 10 MB/MIME limits. An approved public image is returned by `GET /api/public-images/<attachmentId>` as a signed redirect and is readable by anon; unpublishing the listing removes anon access immediately. Anon cannot read private bucket objects, cannot write to any bucket, and cannot replace objects. A tenant can read their own lease document but not a property document or another tenant's lease document.

### H. Main application workflow tests

- [ ] Public: homepage loads; featured listings appear only after publication.
- [ ] Public: rent/sale filters work for category, county/location, type, price range, and bedrooms.
- [ ] Public: property detail renders description, features, approved images (or a placeholder when none), and WhatsApp/enquiry/viewing links. Unapproved/private files never appear.
- [ ] Public: enquiry and viewing forms validate, reject honeypot submissions, enforce rate limits, and create staff-visible records.
- [ ] Public: unavailable/unpublished slug returns not-found; error and empty states render correctly.
- [ ] Auth: valid login lands on the correct role route; inactive profile is signed out; logout clears session.
- [ ] Staff: create owner → property → unit; assign staff; approve application → create lease.
- [ ] Staff: generate rent charges → record payment → allocate → issue receipt → reverse/adjust if needed.
- [ ] Staff: create maintenance request → assign → progress note → expense; notifications appear.
- [ ] Staff: create listing → save draft → publish; verify only published listings appear publicly.
- [ ] Staff: upload/list/delete property photos, unit files, lease documents, and listing photos. Confirm oversized/invalid files are rejected, paths are server-derived, and only publish/approve roles can mark a listing image public. Public visibility requires an active published listing.
- [ ] Staff: respond to an enquiry and viewing; status and follow-up notes persist.
- [ ] Owner: see only owned properties, curated tenant overview, aggregate finance, scoped maintenance, and read-only attachments on their own properties; no direct finance/private-document access to other owners' records.
- [ ] Tenant: see only own lease, payments, receipts, deposits, notices, maintenance, and read-only documents attached to their own leases; no property documents.
- [ ] SEO: page titles/meta descriptions, canonical URLs, property `generateMetadata`, `/sitemap.xml`, `/robots.txt`.
- [ ] Accessibility: keyboard navigation, labelled forms, visible focus, accessible errors and empty states.

### I. Deployment requirements

- [ ] Run `npm run check` and require lint, typecheck, tests, and build to pass.
- [ ] Set the environment variable names from section D in the hosting platform with real environment-specific values; do not commit `.env.local`.
- [ ] Use a supported Node runtime for Next 16 (Node 20.9+); no `engines`/`.nvmrc` is currently pinned.
- [ ] Build command: `npm run build`; start command: `npm run start`.
- [ ] Configure the production domain as `NEXT_PUBLIC_SITE_URL` for canonical URLs, metadata, sitemap, and robots. Empty or invalid values fail the deployed build with an actionable error; do not leave a blank variable in Vercel.
- [ ] Deploy only after all migrations (including `0024`), storage buckets, policies, SQL regression assertions, and smoke tests pass in staging.
- [ ] Verify `/sitemap.xml` includes only the eight static pages plus published active listing URLs, uses request-time data (no build-time Supabase access), and excludes private/protected routes.
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; confirm enquiry/viewing limits are shared across instances and that production denies submissions if either variable is missing or Redis is unavailable.
- [ ] Keep all three buckets non-public; never expose service-role credentials to the client bundle. Public images must remain behind the signed-URL route.
- [ ] Verify no deploy, commit, or push occurs until explicitly approved.

---

## 5. Package and tooling status

`package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `check` (`lint && typecheck && test && build`). Rate-limit behavior tests live in `lib/listings/rate-limit-core.test.ts` and sitemap-mapping tests live in `lib/listings/sitemap-core.test.ts`; both run with Node's built-in test runner through `tsx`.

Supabase CLI: not installed on `PATH`, no local shim, no `supabase/config.toml`, and no package script. Use SQL Editor or install/link the CLI before deploying migrations.

Verification result after the RLS/bootstrap, storage/attachment, shared rate-limiting, publication-integrity, dynamic-sitemap, and final environment-documentation changes: **`cmd /c "npm run check"` passed**. ESLint reported no errors, `tsc --noEmit` passed, all **9** behavior tests passed, and `next build` compiled and generated all **78** pages. Next.js reported Cache Components and Partial Prefetching enabled. The build detected `.env.local` but did not print any values. No check issues were reported. `/api/public-images/[attachmentId]` and `/sitemap.xml` both use `connection()` (not the legacy `dynamic` segment config) to stay request-time under Cache Components; the build confirms `/sitemap.xml` is dynamic (`ƒ`), so no Supabase query runs during prerender. Public images render with `unoptimized` to avoid caching expired signed URLs. No live Supabase or Upstash integration test was performed.

The new SQL assertion files in `supabase/tests/` were authored only; they were **not executed** because SQL execution, Supabase connections, and migrations are out of scope for this task. `supabase` is still not installed on `PATH`, so no CLI validation of SQL syntax was available.
