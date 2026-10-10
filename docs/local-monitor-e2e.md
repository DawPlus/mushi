# Mushi Monitor local browser E2E checklist

This is a **manual final gate**, not evidence of a completed signed-in browser test. The source build, unit tests, local device HTTP check-in, and Supabase JSONB persistence passed on 2026-10-09. The headless Chrome smoke attempt timed out without completing a DOM assertion.

## Preconditions

- Use the existing Git-ignored local environments in `apps/web/.env.local`, `apps/api/.env`, `apps/monitor/apps/api/.env`, and `apps/monitor/agent/.env`; do not copy credential values into tickets, logs, screenshots or chat.
- The logged-in email must belong to the configured Supabase owner user. The Monitor device UUID configured for the Shell must match the server's paired device UUID.
- This test is **localhost-only**. Production Vercel still has no public Monitor API/Remote configuration.

## Run locally, each command from the Mushi repository root

Use separate terminals:

```sh
pnpm dev:api
pnpm dev:web
pnpm --filter @mushi-monitor/api dev
pnpm --filter @mushi-monitor/web dev
node apps/monitor/agent/checkin.mjs --once
```

The expected HTTP endpoints are Mushi Core `127.0.0.1:3000/health`, Shell `localhost:5173`, Monitor API `127.0.0.1:3001/health`, and Monitor Remote `127.0.0.1:5174/remoteEntry.js`.

## Browser acceptance

1. Open `http://localhost:5173/` in the normal browser, perform the owner Supabase email-link sign-in, and verify that the authenticated Shell, Mac status summary and Monitor menu appear.
2. Navigate to `/monitor`. Verify the real Remote loads, CPU/memory/disk/uptime/process fields are labelled with units, and the last check-in and Onion Bridge status are visible. The Remote must never receive a device token or privileged DB credential.
3. Stop sending check-ins and wait longer than 120 seconds. The device must read offline, and cached metrics/Bridge results must be labelled **historical**, not live. Other Shell menus and authentication must keep working.
4. Stop the Monitor API and verify an unavailable/error state rather than a fabricated online status; restore it without requiring a Shell restart.
5. Sign out. Both the dashboard and `/monitor` must deny access to the protected content. Check that unauthenticated calls to the Monitor owner status API return HTTP 401, and that a different Supabase account cannot read the device.
6. Confirm a production build does **not** register the local development-only Remote URL. Do not expose the Mac device-key endpoints or deploy until separate rotation, revocation, replay, rate-limit and hosted HTTPS security gates pass.

## Outcomes

Record pass/fail screenshots **without tokens**, the browser/version, the tested source state, and any errors. If a step fails, leave Acorn E2E pending/failed and repair only the observed defect; do not mark the ticket Done based on build/unit tests alone.
