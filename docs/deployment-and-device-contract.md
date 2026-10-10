# Approved Mushi infrastructure decisions and implementation checkpoints

## Deployment

- **Cloud:** Vercel Hobby runs React Shell/remotes and short-lived HTTP APIs; each service is independently built/deployed. Supabase Free provides shared Auth and PostgreSQL. Free quotas and Vercel Functions runtime limits must be verified before rollout.
- **Mac mini:** optional device. Cloud-only calendars, tasks and hobbies continue working when it is off. Do not require Mac availability for login, shell navigation or cloud persistence.
- **Mac-specific status:** `unknown` (never checked in), `online` (fresh authenticated heartbeat), `offline` (heartbeat expired) and `unavailable` (service errors). Display `lastSeenAt` and label historical metrics stale. Reject offline device actions rather than queue them for surprise execution.

## Outbound device protocol: draft contract

The Mac agent **initiates only outbound HTTPS** to an authenticated cloud endpoint; never expose local 127.0.0.1 device services publicly. Distinguish user Supabase JWT from a short-lived device credential held by the Mac agent. Avoid embedding either in browser code or git.

- `POST /devices/{deviceId}/heartbeat`: device-authenticated, request with monotonically increasing agent session/sequence identifier, observed timestamp, capabilities and sanitized health summary. Server computes authoritative `lastSeenAt` from server time and scopes device ownership.
- `GET /devices/{deviceId}/jobs/next`: short polling, *only* if cloud design authorizes this device. No always-open WebSocket/function, and avoid frequent idle polling to meet free quotas.
- `POST /devices/{deviceId}/jobs/{jobId}/result`: device-authenticated idempotent acknowledgement; job IDs and executions are bound to device and owner. Reject duplicate/replayed results safely.
- Server may offer jobs only when last heartbeat is fresh. A job that has not been acquired before Mac turns off stays explicitly pending/expired according to user-reviewed job policy. For now **do not create deferred offline jobs**. If Mac reboots, it must not surprise-execute stale jobs.
- Security gates before implementation: device pairing/revocation, credential rotation, replay protection, rate limits, payload and command allowlists, audit entries, device/job ownership and user authorization, offline/error codes, CORS. No direct execution endpoints until these pass.
- Heartbeat expiry should initially follow the existing 120-second monitor helper, with a configurable poll cadence. Minimize polling/bandwidth; choose the durable storage and transport before production.

## PostgreSQL

User authorized and completed initial Supabase schema/role provisioning on 2026-10-09. Five service schemas and restricted login accounts exist, and `monitor.device_heartbeats` stores owner-scoped check-ins and sanitized Mac/Onion Bridge summaries in its existing JSONB state column. Revalidated live 5x5 schema grant matrix: own USAGE 5 allowed, cross-schema USAGE 20 denied, all CREATE denied. Monitor alone can CRUD its heartbeat table; no new schema migration was required for metrics. All hosted authentication, device replay/rate controls and production deployment remain pending.

`docs/db/mushi-schema-bootstrap.sql` is a reviewable, single-transaction bootstrap for five new schemas and NOLOGIN owner roles. It fails if names already exist, does not change existing managed Supabase schemas, and does not create privileged runtime logins. A verified admin executor/SQL editor access and explicit environment confirmation are required before execution.

Phase 2 service-specific runtime LOGIN identities and narrowly scoped grants are provisioned. Connection pooling limits, independent schema migrations for future services, and hosted verification remain pending. Test each connection's own-schema access and cross-schema denial. Avoid leaking passwords and do not use a shared Supabase privileged credential as each microservice's database identity.

## Remaining work

1. Complete hosted owner sign-in, browser E2E and user-scoped Core persistence.
2. Add verified device replay/rate protections and a production key revocation/enrollment procedure.
3. Adapt NestJS HTTP APIs for Vercel Functions, then deploy only after security and operational checks.
4. Run Monitor Remote offline/fallback browser E2E and verify other services remain usable without the Mac.
