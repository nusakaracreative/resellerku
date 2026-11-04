# Resellerku Dashboard Preview

This Next.js App Router dashboard is deployed as an isolated Cloudflare Worker named `resellerku-dashboard`.

- Runtime: Cloudflare Workers with the OpenNext adapter.
- Preview mode: `NEXT_PUBLIC_DASHBOARD_PREVIEW=true`.
- Authentication: Supabase Auth; only active Business Owner memberships can enter.
- API: the separate `resellerku-api` Worker.
- Expected preview hostname: `resellerku-dashboard.nusakaracreative.workers.dev`.

This is a review environment. Demo data must remain clearly labelled and must not be treated as real business activity.
