# Notes DB runtime and QA

## Applied to Supabase (2026-10-11)
- Approved Mushi project (ref `mkcjqgbgzfjzudpdbqwo`): `notes.notes`, `notes.note_categories`, `notes.note_tags` schema migrated.
- A separate login role `mushi_notes_api` has USAGE on `notes` and SELECT/INSERT/UPDATE/DELETE on Notes tables only. The runtime role cannot access the Supabase `auth` schema.
- Local `apps/api/.env` holds `NOTES_DATABASE_URL` for the role. It is not checked in or exposed to client environment variables. Do not use the administrator `DATABASE_URL` for Notes runtime.
- Credentials are generated on the host by `apps/api/scripts/setup-notes-db.ts`; running this script again rotates the Notes DB password and updates only the host's local `.env`. Coordinate any other deployed consumers before rotating.
- No Vercel deployment, hosted environment-variable update, or macOS local token setup was performed.

## Security boundary
- Every Notes repository operation takes a verified owner UUID and scopes reads/writes to `owner_id`. A composite foreign key prevents category/tag references across owners.
- Direct PostgreSQL connections do not inherit Supabase `auth.uid()`. The runtime role relies on owner-scoped server SQL and controlled credentials. Database RLS is NOT enabled, so do not expose DB connections or `NOTES_DATABASE_URL` to browsers or untrusted processes.
- Hosted Notes endpoints rely on existing owner JWT and restricted machine bearer checks; the former hosted route allowlist and MUSHI_HOSTED_NOTES toggle have been retired.
- For a future stronger boundary, add a securely scoped per-transaction owner context with database RLS policies. Do not add blanket permissive policies.

## QA evidence (2026-10-11)
- `RUN_NOTES_DB_QA=1 node --import tsx test/notes-live-qa.ts` (from `apps/api` with `.env`): passed create, category, read, filtered list, update, soft-delete and cross-owner no-access using the Notes-only role. QA rows cleaned up.
- `RUN_NOTES_HTTP_QA=1 node --import tsx test/notes-http-qa.ts` (same directory): passed real HTTP 401 (anonymous/invalid token), 201, 200, 204 and 404 with actual Supabase persistence. Uses a random ephemeral test machine bearer in-process; does not configure the user's home machine token. QA rows cleaned up.
- `RUN_NOTES_BROWSER_QA=1 node --import tsx test/notes-browser-qa.mjs` (from `apps/api`, with `pnpm dev:web` running on localhost:5173, port 3000 free and local Chrome installed): passed real browser create/edit/delete through React, NestJS and Supabase; it uses a temporary QA-only machine token plus development guest mode, not a real Google OAuth session. QA rows and temporary Chrome profile cleaned up.\n- `pnpm test:api`, `pnpm typecheck:api`, `pnpm test:web`, `pnpm build:web` and Acorn consistency checks passed in the implementation cycle.

## Hosted release checklist
1. Configure the Notes-only pooled `NOTES_DATABASE_URL` and Supabase owner authentication configuration as server-only secrets in the target hosted environment.
2. Confirm actual signed-in owner browser flow, CORS and deployed HTTP requests; never copy the Notes DB URL or service token into `VITE_*`.
3. Verify monitoring and Bridge stay blocked in hosted mode, make a rollback/revocation plan, and check logs and 4xx/5xx handling before public release.
4. If prod credentials are not configured, Notes intentionally return 503; this is not a successful release.
