# Workflow

Load for managed classification, transitions, gates, repair, or Done. Ordinary answers and simple Quick fixes stay on `AGENTS.md` Load budget.

```text
Plan -> Build -> Verify -> Report                             (Quick)
Plan(ticket) -> Build(TDD) -> Verify(declared gates) -> Reporter -> Done
```

`AGENTS.md` routes. Quick uses an implicit plan. Planner writes managed tickets and ordered gates. Each role owns its transition. Reporter owns archive, Done, and the final report. Roles are responsibilities; Economy is default.

## Classification

- `quick`: tiny, local, low risk -> Worker directly (e.g. copy, isolated styling, single-screen bug without shared-contract change).
- `minor`: ticket only for shared ownership, meaningful risk, multiple gates, or unclear acceptance.
- `feature` / `major`: Planner and ticket by default (e.g. shared hooks across screens, schema migration, auth behavior change).

Escalate for dependencies, schema/migration, config, public contracts, security boundaries, broad file impact, or unclear acceptance.

## Plan

Planner writes the smallest executable ticket using `Goal / Do / Keep / Done / Role / Gates`; optional `Read` and `Depends`. `Gates` is ordered and ends with `docs`. Production-code tickets include `code-review`; add `security` and `e2e` only when their trigger applies. Planner publishes the BOARD row as `ready`, `Next=<worker role>` and then stops.

## Build

TDD is the Worker method for behavior changes: `RED -> GREEN -> REFACTOR`, including E2E authoring when required. It is not a phase or separate role. After focused verification, Worker records evidence and routes to the first declared gate. A justified non-code exception replaces fake TDD evidence.

## Gates

- Canonical map: `acorn/workflow/gates.md` (executable: `acorn/scripts/ticket.cjs`).
- Prefer `node acorn/scripts/ticket.cjs pass|fail|start|block|new|done ...` so BOARD, ticket body, and `acorn/state.json` stay aligned.
- Code Reviewer is the default code gate. Security and E2E run only when declared.
- The last required technical gate routes to Reporter. Failed gates return to Worker under the repair budget.
- A newly discovered gate or scope change returns to Planner; no role silently widens the ticket.
- Every recorded transition must pass `node acorn/scripts/check-docs-consistency.cjs --ticket {ID}` (ticket CLI runs this).

## Repair

Classify failures before repair: reproducible code defect with a new hypothesis -> targeted repair; environment/access failure -> investigate or block without code changes; ambiguous acceptance -> Human clarification; repeated failure/no new hypothesis -> block. Do not waste the shared budget on blind retries.

Initial implementation plus `workflow.maxAgentRetries` repairs share one ticket budget. Default repairs: 1. Increment durable `repairs_used` before repair. Never reset it across roles, sessions, Tasks, or resume. Missing access/environment or no useful hypothesis blocks immediately. Exhaustion -> `blocked`, `Next=human`, with expected, actual, attempted fix, remaining cause candidates, and help needed.

## Report and Done

Reporter checks implementation verification and every required gate receipt, synchronizes affected project docs or records no docs impact, runs applicable docs checks, then completes, archives, and reports under `tickets.md`. It never substitutes its own judgment for a missing receipt.

Done does not authorize commit, push, PR, publish, deploy, or unrelated work. Post-Done feedback is a new request. If real usage reveals a repeatable defect, add a focused regression test to the new request; change shared harness rules only for repeated or systemic failures.

## Context budget

- Default read budget is `workflow.contextBudget.relatedFiles` (usually 2) after the selected ticket or BOARD row.
- Load one role guide and only the skills needed for the current transition. Installed catalog Skills stay inert until loaded.
- Prefer exact paths/symbols over directory scans. Reuse already-loaded guidance until it changes or context is lost.
- Optional catalog/Brain/Orca capabilities do not belong in mandatory Core context; add a default load only when repeated real usage proves it necessary.
- When installed, `acorn/skills/compact/SKILL.md` owns phase-boundary reset detail; this section remains the default contract.

## Context boundaries

Prefer compacting or starting a fresh turn at phase boundaries, not mid-implementation. Write durable decisions to the ticket, BOARD, or project files first.

| Transition | Compact / reset? | Why |
| --- | --- | --- |
| Research -> Plan | Yes | Keep the distilled plan; drop bulky exploration |
| Plan -> Build | Yes when the plan is written down | Free context for code |
| Build -> Verify | Maybe | Keep recent code context if checks need it |
| Debugging -> next feature | Yes | Clear dead-end traces |
| Mid-implementation | No | Paths, partial state, and local names still matter |
| After a failed approach | Yes | Drop rejected reasoning before the next attempt |

Host-specific auto-compact hooks stay outside the portable core.

## Exceptions

Route unresolved product/UX choices, destructive/breaking changes, permissions, risky git, external decisions, ownership conflicts, and exhausted repairs to Human. Planner handles scope/gate revisions. No central Coordinator role exists.
