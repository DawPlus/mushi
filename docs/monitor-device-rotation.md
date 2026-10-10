# Mushi Monitor device re-enrollment / key rotation

This runbook is a manual local procedure, **not** automatic pairing. Never paste IDs, access tokens, database URLs, or Supabase credentials into tickets or logs.

## Before any change
1. Ensure Core API and Mac Agent are running compatible protocol versions (both use canonical `observedAt`).
2. Confirm the Core API and Agent point to the same intended API host and port. Avoid port collisions.
3. Back up `apps/api/.env` and `agent/.env` into a secure local location, retaining private permissions. Do not commit either file.
4. Generate a new cryptographically random token outside version control, at least 32 characters. Use an independent secure password manager or `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` locally. Keep it secret.

## Planned rotation
1. In Core API `apps/api/.env`, set `MONITOR_DEVICE_PREVIOUS_TOKEN` to the **existing** `MONITOR_DEVICE_TOKEN`, replace `MONITOR_DEVICE_TOKEN` with the new value, and set `MONITOR_DEVICE_PREVIOUS_TOKEN_VALID_UNTIL` to a short future UTC time, e.g. 15 minutes.
2. Keep `MONITOR_DEVICE_REVOKED=false` (or unset). Restart only the Mushi API service after checking the correct process and port.
3. In `agent/.env`, replace `MONITOR_DEVICE_TOKEN` with the **new** value. Restart the agent if watch mode is already running; it reads environment on start.
4. Run `node agent/checkin.mjs --once` and confirm the API accepts the request and dashboard freshness recovers.
5. Remove `MONITOR_DEVICE_PREVIOUS_TOKEN` and its expiry from Core API, and restart the API again after validation. Previous secrets should not remain indefinitely. Remove any redundant backups containing expired credentials according to your local secret retention policy.

## Device compromise / revocation
1. Set `MONITOR_DEVICE_REVOKED=true` on the Core API and restart it. Existing and previous credentials should then return HTTP 401.
2. Investigate the potentially compromised device and secret storage. Do not restore service with a suspect token.
3. Generate fresh credentials, set `MONITOR_DEVICE_TOKEN` on API and Agent, clear previous-token grace fields, and check the owner ID/device ID ownership relationship.
4. Only after secure re-enrollment set `MONITOR_DEVICE_REVOKED=false`, restart the Core API and Agent, and verify an accepted check-in.
5. If the device identity itself needs replacement, update `MONITOR_DEVICE_ID` consistently on both sides. This creates a new heartbeat row scoped to the same owner; existing history is not automatically transferred. Decide on DB retention separately, without silently deleting historic records.

## Validation and limitations
- `node apps/api/scripts/verify-replay-db.mjs` tests database monotonic timestamp and owner isolation in a transaction, which is intentionally rolled back. It does not rotate a live secret or change a production device.
- It requires configured server-only Monitor database credentials and the existing schema; it never prints secrets.
- The current system is **single-device, config-driven**. There is no self-service pairing API, credential vault integration, distributed replay nonce service, or audit trail. The timestamp rule reduces old-request replay but does not stop an attacker holding a valid token from sending new timestamps.
- Manual API restart is required for revocation/rotation changes. For a public deployment, implement authenticated enrollment, persistent revocation, audit and managed secret rotation before enabling device jobs.
