# Code Map

Project code entry points. Keep this map tiny and current.

Format:

```text
Area
Entry: path/to/main-file
Related: path/to/related-file, path/to/other-file
```

Rules:
- Record only useful entry points and important relationships.
- Do not catalog every file.
- Prefer 1 entry file and at most 2 related files per area.
- Update only when a change makes an existing map entry wrong or a repeatedly useful area has no entry.
- Remove stale entries instead of preserving history here.

Bridge MCP runtime
Entry: apps/api/src/bridge/bridge.service.ts
Related: apps/api/src/bridge/bridge.controller.ts, apps/api/src/bridge/tools.ts

Bridge Owner Control
Entry: apps/api/src/bridge/owner-bridge.controller.ts
Related: apps/api/src/bridge/bridge-manager.service.ts, apps/api/src/bridge/bridge.module.ts

Bridge web
Entry: apps/web/src/routes/bridge.tsx
Related: apps/web/src/features/bridge/Feature.tsx, apps/web/src/features/system/menu-registry.ts

