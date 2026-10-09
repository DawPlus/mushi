# Ticket Records

Load only for the selected ticket's creation, transition, completion, or exact lookup. Planner creates metadata, each role records its receipt, and Reporter completes. Quick work needs no ticket. Read only the section you own.

## Record

Preserve an existing project format. New tickets use compact YAML front matter:

```yaml
---
id: T-261004-01
state: ready
created_at: "2026-10-04T10:00:00+09:00"
updated_at: "2026-10-04T10:00:00+09:00"
completed_at: null
verification: pending
gates: code-review,docs
code_review: pending
security_review: n/a
e2e: n/a
docs: pending
repairs_used: 0
---
```

Use real ISO 8601 timestamps with an offset. Keep `created_at` immutable; update `updated_at` only on meaningful transitions and set `completed_at` at Done. Required gate receipts are `passed`, `failed`, `pending`, or `n/a`; `gates` is ordered and ends with `docs`.

BOARD owns active `State`/`Next`; the body mirrors it and keeps historical status after archive. IDs use `T-YYMMDD-NN`, reset the sequence daily, and remain unique after archive. Check today's active index and archive filenames without opening unrelated bodies.

## Transition check

Prefer `node acorn/scripts/ticket.cjs new|start|pass|fail|block|resume|verify|done ...` so BOARD, frontmatter, and `acorn/state.json` stay aligned and the consistency check runs. `start` requires `ready`. Verification `pass` requires `in_progress`. `fail` increments `repairs_used` and auto-blocks when the repair budget is exhausted. Blocked tickets need `resume` after `repair_limit >= repairs_used`. Re-passing `verification` resets failed gate receipts to `pending` and routes to the first unfinished gate. After verification has passed, `pass` requires an explicit gate name. `done` checks existing receipts/Result only, then archives, removes the BOARD row, and clears state. Manual edits must still pass `node acorn/scripts/check-docs-consistency.cjs --ticket {ID}` before handoff.

`repairs_used` is the durable shared count. Default limit is `workflow.maxAgentRetries` (`1`). The ticket CLI increments on `fail`; never reset on role change. Only Human may raise optional `repair_limit` before `resume`. On meaningful failure only, append a short `## Attempts` record (`symptom | hypothesis | change | outcome`, with original log pointer). Check prior attempts before retry; the CLI enforces the budget, while the executor must reject repeating an unchanged hypothesis without new evidence.

For a read-only selected-ticket context list, run `node acorn/scripts/ticket.cjs context {ID}`. It prints BOARD `Next`, declared gates, body/role guide paths, and the ticket's `Read` paths with existence diagnostics; it never loads the referenced source files. Paths outside the installed project are reported without reading them.

## Complete and archive

Reporter-owned. Other roles stop after their receipt and transition check.

1. Require `verification: passed` and every declared receipt already `passed`. Write compact `## Result`: outcome, checks/results, docs impact, limitations. Do not invent evidence.
2. Record docs with `node acorn/scripts/ticket.cjs pass {ID} docs`, then run `node acorn/scripts/ticket.cjs done {ID}`.
3. `done` sets `state: done` / `completed_at`, runs completion preflight, moves the body to `{ticketArchivePath}/YYYY-MM/{ID}.md`, removes the BOARD row, clears state, and runs the final completion check. It never writes verification or gate receipts.
4. On failure keep the existing record and successful receipts. Unresolved automation bindings remain.

Archive is retained local history, never an active queue. Do not archive unfinished work, scan all history to resume, or copy logs/transcripts. Post-Done feedback is a new Quick request or linked ticket.

Ticket records are local by default. Init/update adds configured ticket paths to `.gitignore`; source remains shareable. A project that deliberately shares tickets may remove those ignore rules. For already tracked defaults, `git rm -r --cached -- docs/tickets` keeps local files while stopping future tracking.
