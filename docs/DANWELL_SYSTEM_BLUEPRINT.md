# Danwell Property Management Agency — Complete System Blueprint

**Status:** Approved for planning. This document is the single source of truth for the intended system design.

> This is a design document only. It does not authorize code, database tables, migrations, or Supabase changes. Implementation happens in the staged plan at the end of this document.

---

## 1. Project purpose and scope

Danwell Property Management Agency in Kenya needs one platform to run its full property business.

The system covers:

- **Rental management** — properties, flexible units, tenants, leases, rent, deposits, M-Pesa payments, arrears and maintenance.
- **Property sales and marketing** — houses, apartments, buildings, land, shops, offices, warehouses and commercial spaces listed for rent or sale, including properties Danwell markets but does not manage.
- **Portals** — Super Admin, Admin, configurable staff roles, Tenant Portal and Property Owner Portal.
- **Public website** — professional, responsive, SEO-friendly, searchable marketing site with listings, inquiries and viewing requests.
- **Communication** — in-app, email and WhatsApp notifications, with WhatsApp starting as direct links and automated messaging added later.
- **Security and audit** — configurable permissions, Row Level Security, immutable financial corrections and a full audit trail.

Customers and users include property owners, tenants, buyers/prospects, staff and the public.

---

## 2. Agency branding and contact details

| Item | Value |
|---|---|
| Agency name | Danwell Property Management Agency |
| Brand reference | The provided Danwell logo |
| Visual identity | Elegant and professional; dark navy/teal with gold accents |
| WhatsApp / phone | `+254702158435` |
| WhatsApp link | `https://wa.me/254702158435` |
| Email | `danielwanyoike9@gmail.com` |

The logo, colours, contact details and business information must live in **agency settings**, not be hard-coded across the application.

---

## 3. All dashboards and roles

### 3.1 Super Admin

- Full unrestricted access to every module.
- Manages users, roles, permissions, properties, owners, tenants, finances, listings, settings, website content and reports.
- **Safeguard:** the system must always keep at least one active Super Admin. The last active Super Admin cannot be deleted, disabled, or have the Super Admin role removed. This must be enforced in application logic and preferably by a database trigger.

### 3.2 Admin

- Permissions are fully configurable by the Super Admin.
- Typically handles operations, listings, tenant/owner management and reports.

### 3.3 Staff roles

| Role | Main dashboard focus |
|---|---|
| Finance | Charges, payments, deposits, M-Pesa reconciliation, expenses, arrears, owner statements |
| Property Manager | Assigned properties, units, occupancy, leases, tenants, maintenance, listings |
| Caretaker | Assigned buildings, unit status, maintenance issues, tenant contact, WhatsApp shortcuts |
| Field Agent | Listings, buyers/prospects, inquiries, viewings, photos, follow-ups |
| Custom roles | Created by Super Admin with specific module/action permissions |

### 3.4 Tenant Portal

Limited, primarily view-only:

- View tenancy and unit details.
- View rent charges, balances and payment history.
- View receipts.
- View announcements and notifications.
- Report maintenance problems with description, urgency, unit and optional photos.
- Track reported issue status and progress updates.
- Contact management through WhatsApp.

### 3.5 Property Owner Portal

Owners see only their own properties and permitted information:

- Properties and units.
- Occupancy and vacancy.
- Income, expenses and statements.
- Relevant tenant and lease information.
- Notifications.
- Contact management via WhatsApp or email.

### 3.6 Public website visitors

No login. They may browse published listings and public pages and submit inquiries or viewing requests only.

---

## 4. Permission system

### 4.1 Tables

| Table | Responsibility |
|---|---|
| `roles` | Named roles: `super_admin`, `admin`, `finance`, `property_manager`, `caretaker`, `field_agent`, `tenant`, `owner`, plus custom roles |
| `permissions` | `module` + `action` pairs |
| `role_permissions` | Permissions assigned to each role |
| `profile_roles` | Roles assigned to each user profile; a user may hold multiple roles |
| `profiles` | Links Supabase Auth users to people and agency scope |

Built-in roles are marked `is_system = true` and cannot be deleted.

### 4.2 Modules and actions

**Modules:** `properties`, `units`, `owners`, `tenants`, `leases`, `rent`, `payments`, `deposits`, `expenses`, `maintenance`, `listings`, `inquiries`, `viewings`, `website_content`, `users_roles`, `reports`, `settings`, `notifications`.

**Actions:** `view`, `create`, `edit`, `delete`, `approve`, `export`, `publish`.

Example permission: `payments:approve`, `listings:publish`, `maintenance:edit`.

### 4.3 Enforcement

- Application checks use helpers such as `has_permission(module, action)`.
- Property-scoped access uses `is_assigned_property(property_id)` from `property_staff`.
- Supabase RLS policies use the same rules.
- Last Super Admin guard:
  - Count active Super Admins before any delete, disable or role-removal.
  - If the count would become zero, reject the action with a clear message.
  - Mirror the check in a database trigger for defense in depth.

---

## 5. Database structure and relationships

The financial design remains unchanged: `rent_charges`, `payments`, `payment_allocations`, `deposit_transactions`, `payment_reversals`, `allocation_adjustments`, `mpesa_transactions`, `expenses` and `audit_log` are kept as previously approved.

### 5.1 Table groups

| Area | Tables |
|---|---|
| Agency & settings | `agencies`, `settings` |
| Access control | `roles`, `permissions`, `role_permissions`, `profile_roles`, `profiles` |
| Ownership & people | `owners`, `properties`, `property_owners`, `property_staff`, `tenants`, `tenant_contacts`, `buyers` |
| Flexible units | `units`, `room_types`, `unit_rooms`, `unit_features` |
| Tenancy | `rental_applications`, `leases`, `deposits`, `announcements` |
| Money | `rent_charges`, `payments`, `payment_allocations`, `allocation_adjustments`, `payment_reversals`, `deposit_transactions`, `mpesa_transactions`, `expenses`, `owner_statements` |
| Maintenance | `maintenance_requests`, `maintenance_progress_updates` |
| Sales & marketing | `listings`, `sale_inquiries`, `viewing_appointments` |
| Files | `attachments` |
| Communication | `notifications`, `communication_log` |
| Website | `website_pages`, `faqs` |
| Audit | `audit_log` |

### 5.2 Key relationships

```text
agencies
 ├── profiles ── profile_roles ── roles ── role_permissions ── permissions
 ├── owners ── property_owners ── properties
 ├── profiles ── property_staff ── properties
 ├── properties ── units ── unit_rooms ── room_types
 │              └── unit_features
 ├── units ── leases ── tenants
 │        ├── rental_applications
 │        ├── rent_charges ── payment_allocations ── payments
 │        ├── deposits ── deposit_transactions
 │        ├── maintenance_requests ── maintenance_progress_updates
 │        └── listings
 ├── listings ── sale_inquiries ── viewing_appointments
 ├── buyers ── sale_inquiries / viewing_appointments
 ├── payments ── mpesa_transactions / payment_reversals
 ├── payment_allocations ── allocation_adjustments
 ├── attachments ── (property, unit, listing, maintenance, lease, expense)
 ├── notifications / communication_log ── profiles
 └── website_pages / faqs ── public website
```

### 5.3 Important table details

**`property_owners`**

- `property_id`, `owner_id`, `ownership_percentage`, `verification_status` (`pending`, `verified`, `rejected`), `is_primary`, dates, audit fields.
- Ownership percentages may remain **pending verification**: `ownership_percentage` can be blank while `verification_status = pending`.
- Only verified ownership rows count toward the 100% total. When verified, percentages must total 100.

**`listings`**

- `listing_type`: `rent` or `sale`.
- `property_category`: house, apartment, building, land, shop, office, warehouse, commercial, other.
- `status`: draft, active, paused, let, sold, archived.
- `managed_by_agency`: true/false.
- `property_id` and `unit_id` are nullable so Danwell can market a property it does **not** manage; external address/location fields are used in that case.

**`maintenance_requests`**

- `property_id`, `unit_id`, `tenant_id` or `reported_by`, `description`, `urgency` (`low`, `medium`, `high`, `urgent`), `status` (`open`, `in_progress`, `done`, `cancelled`), `assigned_to`, `cost`, timestamps.
- Photos are stored through `attachments` with `entity_type = maintenance_request`.

**`maintenance_progress_updates`**

- `request_id`, `note`, `status_from`, `status_to`, `updated_by`, `created_at`, optional attachment links.

**`owner_statements`**

- Owner, property, period, generated metadata and PDF path.
- Figures are calculated from views at generation time and snapshotted into the document; they are not editable balance columns.

---

## 6. Property, unit and room flexibility

### 6.1 Property categories

Residential and commercial properties, including houses, apartments, buildings, land, shops, offices, warehouses and other commercial spaces.

### 6.2 Units

Units can be bedsitters, studios, apartments, one/two/three-bedroom houses, maisonettes, shops, offices or custom spaces.

`units` holds common fields: `unit_number`, `unit_type`, `status`, base rent, size.

### 6.3 Configurable rooms and features

- `room_types`: bedroom, sitting room, corridor, open kitchen, closed kitchen, common toilet, private toilet, bathroom/shower, balcony, custom.
- `unit_rooms`: links a unit to room types with `quantity`, `is_private`, `notes`.
- `unit_features`: flexible key/value records for amenities and custom features.

This avoids assuming all units have the same layout.

---

## 7. Rental and financial workflows

### 7.1 Lease and rent

- `rental_applications` supports applicants who are not yet tenants: `tenant_id` is nullable and applicant name/phone/email are stored directly.
- On approval, a `tenants` row is created and linked back to the application.
- `leases` store start/end dates, monthly rent, deposit amount, due day and status.
- `rent_charges` are generated monthly for active leases with `unique(lease_id, period_month)` preventing duplicates. Generation is idempotent.

### 7.2 Payments and allocation

- `payments` supports M-Pesa, manual and bank payments, with `payment_type` = `rent` or `deposit`.
- FIFO allocation: oldest unpaid charges first.
- Partial payments create partial allocations.
- Unallocated credit = payment amount minus effective allocations.
- `allocation_adjustments` allow manual reallocation as new audit records.

### 7.3 Deposits

- `deposits` defines the required deposit.
- `deposit_transactions` is a signed ledger: positive increases held amount, negative reduces it.
- Amount held, outstanding deposit balance and deposit status are calculated dynamically.

### 7.4 Corrections and audit

- Confirmed payments are immutable and never silently deleted.
- Corrections use `payment_reversals` and `allocation_adjustments`.
- `audit_log` records sensitive changes with actor, reason and metadata.

### 7.5 M-Pesa

- Callbacks are handled server-side only.
- `transaction_id` is unique, making callbacks idempotent.
- `result_code = 0` is required before confirming.
- Raw payload is stored in `mpesa_transactions` for audit.
- Service-role credentials stay in server environment variables.

---

## 8. Property sales and listings

- Danwell can list properties for **rent** or **sale**.
- Listings cover houses, apartments, buildings, land, shops, offices, warehouses and commercial spaces.
- Listings may be:
  - **Managed by Danwell** — linked to `properties`/`units`.
  - **Marketed only** — not managed by Danwell; external details stored on the listing.
- `buyers` stores prospects and `sale_inquiries` captures inquiries from the website, WhatsApp, phone or walk-ins.
- `viewing_appointments` tracks requested, confirmed, completed and cancelled viewings.
- Authorized admins manage listing photos, price, description, availability and publication status.

---

## 9. Tenant and owner portals

### 9.1 Tenant Portal

- View tenancy and unit details.
- View charges, balances, receipts and payment history.
- View announcements and notifications.
- Report maintenance with description, urgency, unit and photos.
- Track maintenance status and progress updates.
- WhatsApp contact link to management.

### 9.2 Owner Portal

- View only owned properties and permitted units.
- Occupancy/vacancy.
- Income, expenses and owner statements.
- Relevant tenant/lease information the owner is permitted to see.
- Notifications.
- WhatsApp or email contact with management.

Both portals enforce strict RLS; no cross-tenant or cross-owner access.

---

## 10. Maintenance workflows

1. Tenant or staff reports an issue with description, urgency, unit and optional photos.
2. `maintenance_requests` row is created with status `open`.
3. Manager/caretaker assigns staff and sets `in_progress`.
4. Progress updates are appended with notes, status changes and optional photos.
5. Cost, if any, is recorded and can link to an `expenses` row.
6. Status moves to `done` or `cancelled`.
7. Tenant and owner notifications are generated at key stages.

---

## 11. Notifications and communication

### 11.1 Channels

| Channel | Initial approach | Future |
|---|---|---|
| In-app | `notifications` table shown in dashboards/portals | Richer feeds and preferences |
| Email | Prepared templates and queued records | Provider integration |
| WhatsApp | Direct links such as `https://wa.me/254702158435?text=...` | Automated WhatsApp API/provider later |

### 11.2 Event types

Rent reminders, payment confirmations, lease expiry, maintenance updates, owner updates, inquiry follow-ups, viewing reminders and announcements.

### 11.3 Records

- `notifications` — who receives what, channel, status and timing.
- `communication_log` — full history of inbound/outbound email, WhatsApp, SMS, phone and in-app messages.

---

## 12. Public website pages and features

### 12.1 Pages

- Home
- About Us
- Properties for Rent
- Properties for Sale
- Land for Sale
- Commercial Properties
- Property Details
- Contact Us
- Privacy Policy
- Terms of Service
- Refund Policy where applicable
- FAQs
- Tenant Information
- Property Owner Services

### 12.2 Features

- Responsive design for mobile, tablet and desktop.
- SEO-friendly structure: clean URLs, metadata, Open Graph fields, sitemap and robots planning.
- Search and filtering by category, location, price, bedrooms and listing type.
- Property inquiry forms.
- Viewing request forms.
- WhatsApp inquiry links.
- Admin-managed listings, photos, prices, descriptions, availability and page content.

### 12.3 Public data boundary

Public visitors can read only published listings and published public pages. They can create inquiries/viewing requests but cannot read private records. No tenant, owner, financial, staff or internal data is ever exposed to anonymous users.

---

## 13. Security and RLS strategy

- Supabase Auth handles authentication.
- RLS enabled on every table.
- Access decisions use `auth.uid()`, `profile_roles`, `role_permissions` and property assignments.
- Super Admin guard protects the last active Super Admin.
- Anon/publishable key is public; RLS is the real boundary.
- Service role key is server-only, never prefixed with `NEXT_PUBLIC_`.
- Public users: read published listings/pages only; insert-only inquiries.
- Tenants: own records only.
- Owners: own properties and permitted views only.
- Staff: module permissions plus assigned-property scope.
- Financial tables have no DELETE policy for confirmed records.
- All input validated with Zod on the server; database constraints provide a second layer.
- Sensitive changes recorded in `audit_log`.

---

## 14. Storage and documents

- Use a generic `attachments` table with `entity_type`, `entity_id`, `path`, `caption`, `is_primary`, `sort_order`, `uploaded_by`.
- Used for property photos, listing images, lease documents, receipts, maintenance photos and owner statements.
- Files go to Supabase Storage private buckets, never the local filesystem.
- Path convention: `agency_id/entity_type/entity_id/file`.
- Serve private files through signed URLs.
- Public website images may use a controlled public bucket with only approved marketing images.

---

## 15. Four development stages

### Stage 1 — Foundation, auth, security and portfolio

- Agency settings and branding.
- Authentication with Supabase Auth.
- Roles, permissions, profile roles and RLS foundations.
- Last Super Admin safeguard.
- Properties, owners, `property_owners` with pending verification, staff assignments.
- Units, room types, unit rooms, features.
- Attachments/storage foundations.

**Security/RLS begins here, not later.**

### Stage 2 — Rental operations

- Tenants, contacts, applications, leases.
- Deposits and deposit transactions.
- Rent charge generation and duplicate prevention.
- Payments, allocations, FIFO, unallocated credit.
- M-Pesa callback handling.
- Maintenance requests and progress updates.
- Announcements and basic notifications.

### Stage 3 — Sales and public website

- Listings for rent/sale, including marketed-only properties.
- Buyers, inquiries and viewing appointments.
- Public website pages, FAQs, SEO metadata, search and filters.
- Responsive design using Danwell branding.
- Admin-managed website content.
- Direct WhatsApp inquiry links.

### Stage 4 — Control, communication and insight

- Payment reversals and allocation adjustments.
- Owner statements.
- Email/WhatsApp notification provider integration.
- Communication history.
- Full audit reporting.
- Income, arrears, expense, occupancy and owner reports.

---

## Approval note

This blueprint incorporates all final refinements:

1. Last active Super Admin protection.
2. Pending verification for ownership percentages.
3. Marketed-only sales listings.
4. Rich maintenance reporting with progress updates.
5. Notification channel plan with direct WhatsApp links first.
6. Auth and RLS from Stage 1.
7. Responsive, SEO-friendly, searchable public website.
8. Strict public-user data isolation.

No implementation work is authorized by this document alone.
