# Resellerku Owner Dashboard — Stage 3

Next.js App Router workspace for the Business Owner command center. This app lives separately from the Cloudflare Worker so the existing Worker build and deployment are not replaced.

## Stack

- Next.js 16.4.5 / React 19.3.1
- Tailwind CSS 4.3.4
- Supabase JavaScript client 2.118.0
- Browser-only Supabase client with the project's publishable/legacy anon key. Never expose the service-role key in a `NEXT_PUBLIC_*` variable.

## Local setup

From the repository root:

```bash
cd apps/dashboard
npm install
cp .env.example .env.local
```

Fill these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: existing Resellerku project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable key (or legacy anon key)
- `NEXT_PUBLIC_RESELLERKU_API_URL`: existing `resellerku-api` Worker URL
- `NEXT_PUBLIC_DASHBOARD_PREVIEW=false`: set true only to show clearly labeled sample order cards when there are no real orders

Run:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with an active tenant owner account. The demo owner can use the account already configured in Supabase Auth.

## Owner-only behavior

- The shell checks Supabase Auth and an active `tenant_memberships.role = owner` membership.
- All data reads remain tenant-scoped; database RLS is the actual authorization boundary.
- Order details and order items are read from Supabase. Queue selection is local React state and does not reload the page.
- Receipt images remain in the private `receipts` bucket. The dashboard requests a 120-second signed URL from the Worker, which verifies the bearer token and tenant owner role.
- Payment approval goes through the Worker. The owner must explicitly attest that bank settlement has been checked. OCR match alone never changes payment status.
- Marketing assets upload to the private `marketing-assets` bucket; draft/published state controls reseller visibility.

## Important

The app is a frontend workspace; the current Supabase tenant has no real orders. The preview flag only renders non-actionable mock UI. It does not create database transactions or affect business reports.

The backend must be deployed after Stage 3 so these owner endpoints are available:

- `GET /api/orders/:id/receipt-url`
- `POST /api/orders/:id/approve-payment`

Keep the Worker `ALLOWED_ORIGINS` configured for the local dashboard origin during development and the real dashboard origin after launch.
