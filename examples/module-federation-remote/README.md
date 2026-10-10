# Reusable Vite + React Module Federation Remote

Standalone **example**, independent of Mushi internals. Copy this directory to a separate repository or project, then run:

```sh
pnpm install
pnpm build
pnpm preview
```

The built `http://localhost:3903/remoteEntry.js` should be JavaScript, **not** Vite's HTML fallback. This example deliberately uses plain HTTP for local standalone demonstration. Do not use HTTP entries with production federation hosts; use HTTPS with an explicitly approved origin. Never disable production host security validation to accommodate this example.

## Exposed module

- Federation name: `federation_sample`
- Exposed module: `./Feature`
- Entry: `/remoteEntry.js`
- Shared singleton candidates: `react`, `react-dom` (ensure host and remote versions are compatible)
- Local Remote app: `http://localhost:3903`

## Configure a Vite host

In the **host** project's `vite.config.ts`, merge this into the existing `plugins` list:

```ts
import { federation } from '@module-federation/vite'

federation({
  name: 'sample_host',
  remotes: {
    federation_sample: {
      type: 'module',
      name: 'federation_sample',
      entry: 'https://YOUR-APPROVED-REMOTE-HOST/remoteEntry.js',
    },
  },
  shared: ['react', 'react-dom'],
})
```

In a host React component, import the exposed module lazily:

```tsx
import { lazy, Suspense } from 'react'

const RemoteFeature = lazy(() => import('federation_sample/Feature'))

export function RemotePage() {
  return <Suspense fallback={<p>Loading remote…</p>}><RemoteFeature /></Suspense>
}
```

Add the appropriate module declaration for TypeScript if your project does not generate federated types:

```ts
declare module 'federation_sample/Feature' {
  import type { ComponentType } from 'react'
  const Feature: ComponentType
  export default Feature
}
```

Use a React error boundary around `RemoteFeature` in a real host, because network errors or invalid remotes must not crash the shell. For cross-origin browser usage, configure CORS on the Remote and use compatible React versions. Keep actual remote entries trusted: do not build remote URLs from user input.

## Mushi-specific end-to-end test

The **actual verified local Mushi test harness** lives separately in `apps/web/fixtures/remote-e2e` and `apps/web/.env.remote-e2e`. It uses a short-lived self-signed HTTPS certificate, `https://localhost:3903/remoteEntry.js`, and host preview `http://127.0.0.1:5174/ext/test`. These addresses, Mushi registry shape, localhost certificate and test-only auth API proxy are **not** generic production settings. The user confirmed the authenticated remote rendered successfully in the Mushi browser on 2026-10-10.

This folder is preserved as a copyable reference; no production remote has been deployed and no other repository was edited.
