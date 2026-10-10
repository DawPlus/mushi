# Independent Mushi remote repository starter

Copy this folder into a **new independent Git repository** when creating a feature project. It is not part of the existing pnpm workspace.

```text
apps/
  web/     React/Vite frontend, future Federation remote
  api/     NestJS backend, separately deployed
```

The sample FE/BE template installs, builds and passes its basic tests locally. `@module-federation/vite` builds `mushi_sample` with a real `./Feature` export and `remoteEntry.js`. The Mushi Shell registers this sample only in development mode; browser runtime loading, remote error fallback and cross-repository E2E still require verification. Do not expose the local sample address in production.

Contract: expose one default React feature screen, keep domain modals as named exports, use a versioned component contract, and let Mushi Shell own login/sidebar/navigation. Each backend verifies authorization independently. Project-specific database connection and secret environment variables remain on the backend, never in Vite variables. Supabase may be physically shared, but role/schema grants enforce isolation.

Suggested local ports: remote web 5174, remote API 3001 (configure distinct ports for additional remotes). Do not create/push a GitHub repo, provision Supabase, or deploy as part of this template preparation.
