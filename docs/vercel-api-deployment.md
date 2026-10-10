# Mushi Core API: Vercel deployment preparation

Status: **login-only hosted route policy locally verified, not deployed, hosted E2E pending**.

For the first Vercel rollout, `process.env.VERCEL === '1'` activates a fail-closed route policy: only `GET /health` and `GET /auth/owner` are reachable; all other API methods/paths return 503. Local development behavior is unchanged. This reduces exposed functionality but is not a substitute for platform runtime, authentication, rate limiting and live configuration checks.

## Project creation (after security review and explicit approval)

Vercel supports NestJS natively using the existing `apps/api/src/main.ts` entrypoint. **Do not add a duplicate `api/index.ts` handler or a rewrite solely for NestJS.** See https://vercel.com/docs/frameworks/backend/nestjs.

1. In Vercel, **Add New → Project**, import the **same Mushi Git repository** as the existing Web project.
2. Create a **separate API project** and set **Root Directory = `apps/api`**. Do not change the existing Web project's root (`apps/web`).
3. Use Vercel's detected **NestJS** framework / default build and output configuration. Leave custom output directory unset. Select a supported Node.js version and inspect build logs.
4. Configure the **API project's Production environment** (server only, never `VITE_*`):
   - `WEB_ORIGIN=https://mushi-wine.vercel.app` (required by production CORS, exact origin, no trailing slash).
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_OWNER_USER_ID`: verify the same Auth project/owner UUID used by Web.
   - `API_ACCESS_TOKEN`: strong server-only value for guarded non-public API endpoints; never send it to Web.
   - Feature-specific database/device secrets only **when those features are reviewed and enabled**. See `apps/api/.env.example`. Do not copy localhost credentials or .env files to Vercel.
5. **Do not release publicly yet:** security/operations review must address distributed rate limiting (the current limiter is in-memory per instance), Supabase grants, DB role separation, device credentials/revocation/replay controls, persistence, hosted owner-auth and failure-mode tests. In-memory CLI queue is not reliable across Vercel Function instances and must remain staging-only.
6. After a reviewed, approved deployment, verify `https://<actual-api-domain>/health` returns `{"status":"ok"}`. Verify absent/incorrect owner bearer is denied. Test authorized owner with a real session, CORS against exact Web origin, and rollout/rollback behavior. A healthy endpoint **alone** is not a release gate.
7. Only then set `VITE_API_BASE_URL=https://<actual-api-domain>` in **existing Web project's** Production env, redeploy Web, verify Google sign-in and `/auth/owner` in the browser, and verify no localhost calls remain.

## Current blockers

- Public release approval and full security review pending, particularly shared rate limiting and live Supabase/DB grants.
- Production API has not been created, built on Vercel, or verified.
- Changing Supabase OAuth Redirect URLs fixes only the Auth callback; Mushi Web also requires a deployed, accessible Core API to check `/auth/owner`.
- Do not run migrations, rotate device credentials, register launchd, change existing Web settings, or enable CLI execution as part of this preparation.
