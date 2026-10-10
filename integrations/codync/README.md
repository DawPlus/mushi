# Codync integration (isolated prototype)

A zero-dependency, server-side-only Node.js adapter for the locally installed Codync Host (v2.12.0 API). This folder intentionally does not modify `apps/`, `templates/`, workspace manifests, or existing Mushi services.

## Verify

```bash
node --test integrations/codync/client.test.mjs
node integrations/codync/smoke.mjs
```

Health requires no token. Protected calls use `POST /api/<method>` with a loopback-only Bearer token; events use the separate authenticated SSE endpoint `GET /events`. **Never expose the token in browser code or logs.** Supply credentials only from a trusted backend process; do not read or copy token files into this repository. The `call(method, args)` method can perform mutating operations and must be protected with explicit owner authorization and a strict method allowlist before wiring it to Mushi API.

Verified locally against Codync Host 2.12.0: `POST /api/sync` with `{ "since": 0 }` and the host's local Bearer token returns a bot roster (3 bots observed on 2026-10-10). No token or conversation content was persisted or logged. `client.bots()` exposes this read-only operation; `client.history(botId)` provides an authenticated history request. The generic `call()` method is not safe to expose directly through a web API.

Next steps: add read-only endpoints to `apps/api` under a separately owned Acorn ticket and its owner-auth boundary, then integrate Agents UI after existing Bridge work settles. Keep runtime tokens outside source control and browser bundles.
