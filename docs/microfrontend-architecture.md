# Mushi app architecture contract (draft)

## Ownership and workspace

- `apps/web` / `apps/api`: Mushi Shell, core dashboard, login and shared platform APIs.
- `apps/monitor/apps/{web,api}`: Mac monitoring and Onion Bridge status; `apps/monitor/agent` holds the Mac outbound check-in client.
- `apps/terminal/apps/{web,api}`: authorized device jobs and terminal control.
- `apps/automation/apps/{web,api}`: n8n-oriented workflows.
- `apps/agents/apps/{web,api}`: OpenHarness-facing features.
- These existing features belong to **one Mushi Git repository and one root pnpm workspace**. They retain distinct FE/BE packages and can be developed and built separately. The root pnpm workspace and lockfile are authoritative; redundant service-local workspace manifests and lockfiles were backed up outside Git and removed.
- **Future standalone products** may live in their own Git repositories and connect to the Mushi Shell through Module Federation. A shared UI component package is intentionally deferred.

## Frontend integration contract

- Shell owns sign-in, top-level authorization gate, navigation, and the active menu. Each remote owns its route content and exposes an explicit module entry point through Module Federation (actual plugin/version selected and tested in T-261009-10/11).
- A remote registration contains a stable ID, label, route prefix, approved HTTPS remote entry URL, exposed module name and expected contract version. Never interpolate a request-supplied URL into remote imports; registries are trusted build/deployment config.
- Host renders a loading state, error boundary and unavailable state for remote load failures; shell login and other menu items remain usable.
- Exposed React screen contract is a default component receiving a small versioned host context; context contains no long-lived service credentials. Remote modals may be exposed by explicit name. Component events and props are typed/versioned.
- React and react-dom must be compatible singletons at runtime. A remote upgrade must support agreed contracts or be rejected/fall back. CSS isolation/naming is required to avoid leaking styles between remotes.
- Sharing code via an ordinary versioned package is preferable for basic buttons/inputs/dialog shells. Use federation for independently deployed domain screens and modals.


## External remote registration contract (T-261009-17)

- `apps/web/src/features/system/remote-registration.ts` validates a deploy-controlled v1 registration containing `id`, `label`, `route`, `entry`, `exposedModule` and `contractVersion`.
- Only exact allowlisted HTTPS origins and `/remoteEntry.js` paths are accepted. Credential-bearing, query-string and fragment URLs are rejected. Route is `/ext/{id}`, with reserved built-in routes blocked and duplicate IDs rejected.
- This validator does not dynamically register or load an arbitrary remote. Actual loader, failure boundary and rollback/E2E are separate tasks. No user-submitted URL is trusted.

- `apps/web/src/features/system/remote-compatibility.ts` validates per-remote release manifests against registered entry, v1 contract and React 19 singleton majors; rejected remotes stay disabled without impacting valid siblings. This is preflight only, not remote execution.

- Vite build can now register approved Federation remote entries via `MUSHI_REMOTE_REGISTRY` JSON and `MUSHI_REMOTE_ALLOWED_ORIGINS` (comma-separated exact HTTPS origins); both are deploy-controlled settings. Empty registry loads none. This is static Federation registration, not a UI route/screen loader or an authorization boundary.

- The Shell routes approved remotes via `/ext/$remoteId`. `remote-routes-plugin.ts` emits static Federation import expressions only for build-approved registrations. Route lookup is owner-login-wrapped and unknown IDs fail closed. Each Remote render has local Suspense and an error boundary so failed modules do not crash the main Shell. Real Remote browser E2E remains a release gate.

## Backend and trust boundaries

- Each service package owns its NestJS API and independently verifies Supabase-issued identity, audience/issuer and feature authorization. A visible Shell menu is never an authorization check. Do not forward machine-server secrets or database credentials to the browser.
- API base URLs and CORS allowlists are configured independently per service. Browser code never calls Mac localhost directly. Mac agent executes only allowlisted operations following authenticated server-side requests.
- Supabase project is shared initially, but service boundaries are not. Each service owns a separate schema (`core`, `monitor`, `terminal`, `automation`, `agents`), database role, connection configuration, migrations and least-privilege grants. Merely using separate pool objects or schemas is not an access-control boundary without database privileges.
- Total DB connections across services share the Supabase project's limits; bound pool sizes and consider a pooler. Project-to-project data exchange goes through documented APIs/events rather than cross-schema writes.
- Later physical Supabase separation should require swapping service configuration and moving owned data, not direct cross-project joins. Auth-provider separation may require additional migration work.

## Hosting and optional Mac mini availability (confirmed)

- Personal, noncommercial default: Vercel Hobby for independently deployed Shell/remote frontend and short-lived NestJS HTTP APIs (after adapting each API to Functions); Supabase Free for shared Auth and persistent data. Hosting is an architectural choice, not a claim that any API has been deployed or that free quotas cannot change.
- Mac mini is **optional and may be powered off**. Calendars, tasks, hobbies and other cloud-backed features must remain usable without Mac connectivity; neither Shell boot nor shared authentication may require a Mac heartbeat.
- Mac-dependent features (metrics, device CLI, service operations, Onion Bridge/OpenHarness where hosted locally) display **offline/unavailable** without breaking unrelated menus. If appropriate, show read-only last-known device status with an explicit timestamp and stale label; never present cached metrics as live.
- Reject new Mac command execution while offline rather than silently queueing it for execution after reboot. Only explicitly designed/approved durable jobs may have a different policy. Never assume Mac is online solely because its browser client is open.
- Mac agent initiates an authenticated outbound connection/check-in to a cloud endpoint; avoid mandatory inbound Mac port exposure. Mac offline detection should use last heartbeat plus expiry, with an explicit **unknown** state until the first heartbeat. A Vercel Function is not a permanent agent connection endpoint, so choose polling or a supported intermediary before implementing transport.
- No user action or payment is needed merely because the Mac is off. Backend operations should return a clear, non-5xx unavailable state for expected offline conditions; monitoring traffic must be throttled to fit free tiers.

## Migration order and rollback

1. Keep working Mushi deployment intact. Document contracts and select a working federation toolchain against the current React/Vite versions.
2. Add a host registry and error boundaries; verify a harmless local sample remote.
3. Use the existing in-repository FE/BE apps; create separate repositories only for future standalone products with explicit approval.
4. Extract Mac Monitor as first real remote, retaining old route until cross-app login, status and failure E2E pass; then switch menu registration behind a reversible flag.
5. Integrate project-level API auth and schema-scoped storage only after DB authorization/migration approval.
6. Roll out the remaining remotes incrementally. Keep a host-side unavailable fallback and version-pinned remote entry for rollback.

## Scope and unresolved checkpoints

No independent GitHub repositories, live remote deployments, PostgreSQL roles, schemas or migrations are created by this document. Choose and verify a compatible federation plugin, cross-origin cookie/token handling, remote asset cache policy, and deployment domains before production rollout. Existing tickets T-261009-02 through 08 remain the source of feature-level completion requirements.
