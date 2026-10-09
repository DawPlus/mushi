# Project Role Overrides

Optional project-only role map. Keep only differences from Acorn defaults.

Rules:
- project override wins over Acorn default;
- `acorn/config.json` → `roles` registers workflow roles and guide paths for CLI validation. Register project roles once, e.g. `"frontend": { "guide": "acorn/agents/worker.md" }`; do not duplicate ownership here;
- this file owns recurring project executor assignments and path ownership. Changing who does FE/BE work only changes this file; it does not require changing Acorn's guides. A ticket `Executors` entry may override it for that ticket; otherwise the current Agent performs the role;
- Planner owns ticket scope/gates; verification roles own their gates; Reporter owns completion. Role count never requires the same number of agents;
- read only the matching role entry for current work;
- each role owns only its listed paths/area;
- do not cross into another role's owned area;
- cross-role work follows the declared gate flow; scope/gate changes return to Planner;
- shared files/contracts need one explicit owner before edits.

No project overrides are active in this template. The fenced example below is illustrative only: never infer assignments, ownership, or registered roles from it.

Example (inactive):

```text
frontend -> executor: agent | owns: src/**
backend  -> executor: agent | owns: server/**
tester   -> executor: agent | owns: test/**
reporter -> executor: agent
shared   -> planner assigns one owner
```

Delete the example and define only roles this project actually uses. Write active entries outside code fences as `name -> ...` (optional list prefix; `→` also accepted). Doctor warns about unregistered names in that format, ignoring fenced examples; other prose formats are not validated.
