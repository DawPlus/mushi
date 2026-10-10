# Mushi integration contracts, backend stage (2026-10-10)

## Owner CLI job staging API
The Core API now exposes owner-authenticated **job staging** endpoints:
- `GET /owner/cli-jobs`: list only jobs owned by the verified Supabase user
- `GET /owner/cli-jobs/:id`: inspect one of that owner's jobs
- `POST /owner/cli-jobs`: JSON `{ "command": "node-version", "requestId": "unique_request_123" }` to stage a safe read-only job
- `POST /owner/cli-jobs/:id/cancel`: cancel only a pending job

All require `Authorization: Bearer <Supabase user access token>`. The server verifies this token with Supabase and checks the configured owner UUID. The global API bearer guard is bypassed **only** for these routes so the owner-JWT verifier can process its different credential type.

**Important:** Jobs stay in process memory. No background worker, execution trigger, device dispatch, Web UI or persistent queue is connected. A staged job will remain pending until cancelled/expired/server restart. The command allowlist is still just `node-version` or `git-version`; it cannot run arbitrary commands.

## Planned agent transport (not enabled)
A future device agent job transport requires:
1. An explicitly paired and not revoked device with verified owner binding and device credential.
2. Server-controlled job expiry, unique delivery lease/session, and one-time acquisition.
3. Signed or authenticated acknowledgements with monotonic sequence/unique result ID to reject replay.
4. Explicit user confirmation for any future command that changes local state.
5. Audited job creation, lease, completion and cancellation without recording tokens, raw shell text or process secrets.
6. Persisted shared queue and multi-instance concurrency coordination. Never auto-execute old offline work after reconnection.

A fail-closed, pure validator for proposed delivery leases lives in `src/system/device-job-contract.ts`. It checks the paired device ID, a job UUID, a lease identifier, the read-only command allowlist and expiry within 60 seconds. **Validation is not authentication or authorization, and does not execute anything.** Do **not** implement polling/execute endpoints until a durable job store, verified credentials, acknowledgement replay defense, and the full device protocol are security-reviewed. This is not a deployed remote terminal.

## External projects
`src/system/external-project.ts` validates static metadata. The owner-JWT-verified registry now offers `GET /owner/projects`, `POST /owner/projects`, and `POST /owner/projects/:id/remove`. Registration accepts regular project homepage URLs as metadata, including loopback HTTP (`http://127.0.0.1:3847/`). Loopback origins are accepted for local development; other origins require an exact match in server-only `EXTERNAL_REMOTE_ORIGINS`. Every registration remains disabled, and no URL is fetched or executed. The API never fetches or runs the remote code, and cannot change Module Federation runtime configuration. Entries are process-local and disappear on API restart. Production loading requires a separately reviewed allowlist and pinned release manifests.

## Production gates (not passed)
Hosted owner sign-in E2E, source/origin allowlisting, distributed rate limiting, revoked-key behavior across instances, structured audit retention, durable jobs, Mac offline/online resilience, user-approved launchd activation, and Vercel target-runtime deployment verification all remain pending. No cloud deploy, service restart, schema migration or Mac service registration is performed here.
