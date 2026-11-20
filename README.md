# Danwell Property Management

Danwell is a cloud-based property management application for staff, owners and
tenants, with a public marketing website for rental and sale listings. The code
includes authenticated portals, role/permission checks, property and tenancy
records, finance and maintenance workflows, attachment management, public
enquiry/viewing forms, and a dynamic sitemap.

This repository does **not** contain a service-role key or any real credential.
All hosted setup must be supplied through environment variables and the Supabase
dashboard/CLI.

## Stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript |
| Framework | Next.js 16 App Router (Turbopack configuration) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix base), Lucide icons |
| Hosting | Vercel (recommended) |
| Database | Supabase PostgreSQL with Row Level Security |
| Authentication | Supabase Auth (Email / Password) |
| Authorization | Database roles/permissions plus DAL and route guards |
| File storage | Supabase Storage; all buckets are non-public |
| Database access | Official `@supabase/supabase-js` client; no ORM |
| Validation | Zod |
| Rate limiting | Upstash Redis REST via `@upstash/ratelimit` |
| Tests | Node built-in test runner with `tsx` |
| Code quality | ESLint and TypeScript compiler checks |

## Prerequisites

- Node.js **20.9+** (this machine uses v22.16.0)
- npm
- Git
- A [Supabase](https://supabase.com) account
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account for hosting
- An [Upstash](https://upstash.com) Redis database for production public forms

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file from the safe template:

   ```bash
   cp .env.example .env.local
   ```

3. Replace the placeholders in `.env.local` with values for the environment you
   are targeting. Use the Supabase dashboard under **Project Settings → API**
   for the Supabase URL and anon key. Never commit `.env.local`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

For local public-form testing, leave both Upstash variables blank. This enables
the development-only in-memory fallback. See **Environment variables** below
for production requirements.

## Environment variables

### Required in all environments

| Variable | Where it is used | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL. Also used to derive the configured Storage image hostname. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Supabase anon/publishable key. Data safety comes from RLS policies. |
| `NEXT_PUBLIC_SITE_URL` | Server-rendered metadata and public links | Absolute site URL with no trailing slash; used by `metadataBase`, canonical URLs, `/sitemap.xml`, `/robots.txt`, and WhatsApp sharing links. Set it to the staging domain in staging and the production domain in production. |

The two public Supabase values are validated at first use by
`lib/supabase/env.ts`. The site URL is resolved by `lib/site-url.ts`: local
development uses `http://localhost:3000` when it is unset, but deployed builds
fail fast with an actionable error if `NEXT_PUBLIC_SITE_URL` is missing, empty,
or not an absolute `http(s)` URL. Set it for every Vercel environment before
building so metadata, canonical URLs, sitemap, robots, and sharing links point
to the correct host.

### Required in production and hosted staging

| Variable | Where it is used | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Server only | Upstash REST endpoint for shared public-form rate limits. |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | Upstash REST token for shared public-form rate limits. |

Both Upstash values are required for production public enquiry and viewing
forms. A partial configuration, missing production configuration, or Redis
provider failure denies submissions. When both are absent and `NODE_ENV` is not
`production`, an in-memory fallback keeps local development usable; it is never
used in production.

`NODE_ENV` and `VERCEL_ENV` are also read by the rate limiter to detect
production. They are set by Next.js/Vercel and must not be added manually.

`.env*` files are ignored by Git; only `.env.example` with placeholders is
committed. On Vercel, add the variables above under **Project → Settings →
Environment Variables** for Production and, when needed, Preview. Never store
real credentials in this repository.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm test` | Run rate-limit and sitemap behavior tests |
| `npm run check` | Lint + typecheck + tests + build; run this before deployment |

The tests use Node's built-in test runner through `tsx`. Behavior tests live in
`lib/listings/rate-limit-core.test.ts` and `lib/listings/sitemap-core.test.ts`.

## Supabase setup and migrations

1. Create a Supabase project with Postgres, PostgREST, Auth and Storage enabled.
2. Enable **Email / Password** auth, confirm emails, and disable public sign-up.
   Configure the Supabase Site URL and redirect URLs for local, staging and
   production domains.
3. Put the project URL and anon key into the environment for each deployment.
4. Apply the prepared SQL files in `supabase/migrations/` in filename order.
   There is no migration npm script and no `supabase/config.toml`; use the
   Supabase SQL Editor or a linked Supabase CLI.
5. `0010` is intentionally absent. Do not look for it.
6. Stop after `0009` for the manual Super Admin bootstrap described below.
7. After bootstrap, apply `0011` through `0024` in filename order. `0024` must
   be applied last because it installs the listing publication trigger.
8. `0023` creates the three Storage buckets (`public-marketing`,
   `private-documents`, `property-private`). Keep all of them non-public; public
   listing images are served through short-lived signed URLs.

The prepared migration inventory, dependencies and staging sequence are
documented in [`docs/DANWELL_LAUNCH_READINESS.md`](docs/DANWELL_LAUNCH_READINESS.md).

### First Super Admin bootstrap: before migration `0011`

`0009_bootstrap_first_super_admin.sql` installs a service-role-only bootstrap
RPC. `0011_remove_bootstrap.sql` removes that RPC and permanently closes the
bootstrap surface. Do not apply `0011` until the first Super Admin has been
created and verified.

1. Apply migrations `0001` through `0009` only.
2. Create the first administrator in Supabase Auth using Email / Password and
   confirm that user's email.
3. From a privileged SQL context, call the bootstrap RPC with the verified
   email address:

   ```sql
   select public.bootstrap_first_super_admin('<verified-admin-email>');
   ```

4. Verify that an active profile and active `super_admin` role assignment were
   created. Sign in as that user and confirm the dashboard loads and
   `get_my_active_role_names()` includes `super_admin`. This browser sign-in
   check is a manual release gate.
5. Run the pre-flight query in the header of `0011_remove_bootstrap.sql` and
   require the guard to be present and closed, at least one active Super Admin
   to exist, and that Super Admin to be verified.
6. Only then apply `0011_remove_bootstrap.sql`. Its internal checks fail closed
   if the gate is not satisfied. Do not weaken those checks.

After `0011`, additional Super Admins must be assigned by an existing Super
Admin. The application itself does not use a service-role key.

## Upstash setup for production public forms

Public enquiry and viewing forms use a shared fixed-window rate limiter backed
by Upstash Redis. This is required when running multiple instances or serverless
functions because local memory is not shared.

1. Create an Upstash Redis database.
2. Copy the REST URL and REST token from the Upstash console into
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the hosting
   platform. These are server-only secrets.
3. Set both values for Production, and for Preview if public forms are tested
   there. Leave both blank for local development.
4. Verify that repeated submissions are limited across requests and that
   production denies submissions if either variable is missing or Redis is
   unavailable.

The limiter implementation and its behavior tests are in
`lib/listings/rate-limit-core.ts` and `lib/listings/rate-limit-core.test.ts`.

## Project structure

```text
app/                    Routes, layouts, metadata, sitemap and robots
components/             Shared UI, portal and public-site components
docs/                   Deployment and launch-readiness documentation
hooks/                  Shared React hooks
lib/                    Supabase clients, authorization, listings and domain logic
proxy.ts                Next.js request-time session refresh/route protection
public/                 Static assets
supabase/migrations/    Prepared SQL migrations
supabase/tests/         Catalog and staging SQL assertions
tests/                  Compile-time auth guard checks
types/                  Shared TypeScript types
.env.example            Safe, committed environment template
AGENTS.md               Next.js guidance file generated by create-next-app
```

## Security notes

1. Supabase anon/public keys may be exposed to the browser; RLS is the data
   boundary.
2. The application does not use a service-role key. Do not add one to the
   browser bundle or to environment variables that are exposed to clients.
3. Keep all Storage buckets non-public. Upload paths and buckets are derived on
   the server, and public images are exposed only via signed URLs.
4. Public listing reads require published and active records; publication
   transitions require `listings:publish` under the database guard.
5. Never commit `.env.local`, real keys, or deployment secrets.

## Deployment preparation

1. Run `npm run check` and require lint, typecheck, tests and build to pass.
2. Configure the environment variables listed above in the hosting platform;
   do not copy `.env.local` into source control.
3. Set `NEXT_PUBLIC_SITE_URL` to the exact deployment origin with no trailing
   slash. Update Supabase Auth Site/redirect URLs to match.
4. Apply and verify migrations in the target database only after staging
   verification passes. Preserve the `0009` → bootstrap/verification → `0011`
   gate and apply `0024` last.
5. Verify the Storage buckets remain non-public and that the SQL assertions and
   smoke tests in `docs/DANWELL_LAUNCH_READINESS.md` pass in staging.
6. Confirm Upstash is configured for production and public forms fail closed on
   provider or configuration failure.
7. Confirm `/sitemap.xml` is generated at request time and contains only public
   pages plus published active listings, with no private or protected routes.
8. Use `npm run build` and `npm run start` for the production build. Vercel
   detects Next.js automatically; no `vercel.json` is required.
9. Do not deploy, commit or push until explicitly approved.
