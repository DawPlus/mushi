# Database and authentication roadmap

Prisma 7 is configured for PostgreSQL in apps/api/prisma/schema.prisma and apps/api/prisma.config.ts. Offline schema validation does not require an external service. Do not run migrations before a project connection is configured.

Later set DIRECT_URL for Prisma migration tooling, and DATABASE_URL for a separately configured pooled runtime connection. Do not commit either secret. The Prisma client runtime/adapter is not installed or wired to NestJS yet.

## Current API protection (server-to-server only)

NestJS applies a global Bearer guard to API routes. Only `GET /health` is explicitly public. `GET /auth/check` is a protected endpoint for testing access. Set `API_ACCESS_TOKEN` as a private server environment variable with a long randomly generated value; send `Authorization: Bearer <token>` over HTTPS. If it is missing or wrong, protected routes return HTTP 401. The API must not be publicly deployed with an easily guessed token. Never put this token in the React bundle, `VITE_` variables, Git, screenshots or chat logs. Rotating the token requires updating authorized server-side clients; this MVP uses one shared token and has no per-user permissions, revocation list or rate-limiting. Keep `/auth/check` server-to-server and do not expose a browser-based token form.

## Future personal login

Use Supabase Auth for identity when the external setup is ready. The NestJS API must verify signed access tokens, issuer, audience and expiry before granting access. Only invited accounts should be allowed initially. Never put database credentials or privileged API keys in browser code.

The initial `Device`, `DeviceSnapshot`, and `DeviceJob` Prisma models have been defined but not migrated. They do not currently enforce ownership or row-level security. User login is not enabled; the existing shared API token guard is not a replacement for user authentication.

## Local configuration and deployment boundary

- Copy `apps/api/.env.example` and `apps/web/.env.example` to `.env` or `.env.local` in their respective apps and replace placeholder values locally. Git ignores these local files; do not commit real secrets.
- `API_ACCESS_TOKEN`, `DIRECT_URL`, and `DATABASE_URL` belong exclusively to trusted server-side processes. Any `VITE_*` setting is exposed in the browser build. Never send a server token to the browser.
- Before a public Vercel deployment: create a personal Supabase project, decide the sole allowed owner identity, implement and verify signed Supabase Auth JWT validation plus per-owner authorization, and configure the API hosting and protected Mac communication path. Vercel web hosting alone does not expose the local NestJS API securely.
- Do not run schema migrations or claim an authenticated dashboard until these prerequisites are in place. Offline `pnpm db:validate` only validates schema syntax.
