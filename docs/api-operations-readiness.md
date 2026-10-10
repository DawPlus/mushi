# Mushi local security and operational readiness (2026-10-10)

These changes do not deploy a service, register launchd, execute privileged commands or modify Web UI.

## 1. Core API authentication and burst protection
- All non-public endpoints retain the global API bearer guard.
- Public owner and device heartbeat endpoints independently verify owner JWTs or device credentials.
- BurstLimitGuard limits owner auth to 30 requests/minute and device heartbeat calls to 120 requests/minute per observed peer address, method and endpoint group.
- In-memory protection is **local prototype only**. Never treat it as distributed protection; before multiple hosted instances use a vetted shared rate-limit service. Reverse-proxy IP trust must be configured explicitly; no user-supplied X-Forwarded-For is accepted as a client identity.
- Device token rotation supports a previous token only until its configured expiry. Never log or expose bearer tokens.
- Device emergency revocation: set `MONITOR_DEVICE_REVOKED=true` in the Core API server environment and restart the API. Both current and previous device credentials are rejected with 401. This is a manual, single-device setting, not a hosted pairing/revocation service; changing the file alone does not update an already-running server. Restore only after issuing a fresh device secret and verifying ownership. Never paste keys into tickets or logs.
- Heartbeats now include a canonical UTC observedAt timestamp (within five minutes of server time). An atomic database conflict condition rejects timestamps that are older than or equal to the last accepted heartbeat, using existing JSONB state. Duplicate or stale requests return HTTP 409. This reduces basic replay but does not protect against stolen bearer tokens. Agent and API must be upgraded together; older agents without observedAt will be rejected. Production database behavior still needs live verification.

- Device authentication audit logging records only allowlisted event types and server timestamps (auth denied, invalid payload, accepted/rejected heartbeat, storage error). It deliberately does not log device identifiers, remote IPs, tokens, headers or request bodies. Logs are per-process operational output, not a durable audit trail; use an approved retention/redaction sink before production.

## 2. Mac Agent
- One-shot and watch modes validate API endpoint and credentials; watch mode removes temporary shutdown listeners between intervals.
- `node agent/generate-launchd.mjs` emits a launchd plist that uses the current Node executable and repository directory; it does **not** install or register the service.
- KeepAlive is deliberately disabled. Starting on user login requires the user's manual review and launchctl registration (agent/README.md). A failed agent is not silently restarted.

## 3. Monitor
- The server owns `lastSeenAt`; missing/invalid/future dates are unknown, freshness <=120 seconds is online, older data is offline. A fresh later heartbeat restores online.
- Mac agent's 90-second default interval leaves a 30-second margin. Monitor data becomes stale if the Mac sleeps; do not interpret stale metrics as live data.
- Database permission and device/owner ownership checks must remain in place.

## 4. Remote CLI
- `cli-policy.ts` only permits named read-only `node-version` and `git-version` operations.
- `cli-runner.ts` uses `execFile` without a shell, with timeout and bounded output. `job-queue.ts` is local and in-memory. Its job lookup returns a defensive copy; cancellation only applies to pending jobs (running subprocesses are not interrupted), and completed/cancelled history is capped at 100 entries to bound memory. A full queue rejects additional pending jobs.
- Local CLI job management also supports owner-scoped lookup/cancellation, per-owner idempotency request keys (same key/different command rejected) and pending-job TTL expiry before execution. Owner parameters are internal metadata and do not themselves authenticate a caller. Expired jobs use the cancelled status in the current local prototype.
- `owner-job.service.ts` adds an internal validated UUID owner facade around job creation/list/lookup/cancel, with per-owner isolation and request idempotency. The owner ID is **not verified within this facade**; the trusted caller must verify the user's Supabase access token first. It is deliberately not registered as a controller or exposed over HTTP.
- **Do not expose a public command execution route** until authenticated per-device ownership, explicit confirmation, audit log, device revocation, request replay protection and no-surprise-offline-job policy have been implemented and tested. Owner-only job **staging** endpoints exist, but they neither start commands nor dispatch work to devices.

## 5. Operational checks
- `pnpm check:ops` checks presence of key workspace, guard and agent files; it is non-invasive and **not** a deployment readiness certification.
- `pnpm test:api`, `pnpm build:api`, `pnpm test:agent`, `pnpm check:acorn` verify local code and ticket consistency.
- Before public deployment: verify hosted Supabase owner sign-in, role-scoped database connections, target Vercel runtime, authentication E2E, per-device pairing and revocation, distributed rate limiting, device replay defense and production monitoring.
- FE work stays in Acorn tickets; do not modify `apps/web` while its designer is editing it.
