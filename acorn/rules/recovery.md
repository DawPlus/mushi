# Recovery

Use after interruption, stale context, repeated failure, or nonterminal/uncertain automation.

1. Read `acorn/state.json`.
2. Read `ticketBoardPath` from `acorn/config.json` and verify any active ticket against that project board.
3. Before selecting an executor, reconcile missing or terminal (`done`/`superseded`) active tickets and conflicting `next` values; trust the project SSOT. A missing Board row may have been archived: resolve only that ID's archive record under `acorn/workflow/tickets.md`, never scan all history or infer completion from absence. Never resume work solely because the cache names it.
4. The role owning the recovered `Next` transition rebuilds cache from project truth. If no active managed work remains, Reporter or Human clears `activeTicket`, `classification`, `phase`, and `next`; resets `verification` and gate statuses; refreshes `updatedAt`. Never infer another ticket. Preserve automation bindings and repair counts until live outcomes settle.
5. Load the guide for the exact revalidated `Next` role only when work remains, then only linked context needed to continue. Legacy `coordinator`, `qa`, or `ready_for_qa` state returns to Planner for mapping into current gates.
6. Treat handoff and state as continuation caches, never project truth. Follow `acorn/workflow/handoff.md`; `status`, `handoff`, and `doctor` diagnose stale state without rewriting it.

Before any direct edits or Dispatch, reserve ownership for live/unverifiable workers; Economy fallback never bypasses this gate. Read-only inspection and settlement remain allowed. For an authorized Orca automatic run, load installed `acorn/skills/orca/SKILL.md`. A saved `automation` record cannot authorize execution. Require explicit Human auto-resume after pause, cancellation, interruption, or a Human gate; inspect live Orca bindings before any new Dispatch. Preserve repair counts and reserve ownership while worker liveness is unknown. Never create a fresh Run to bypass retry limits or duplicate a possibly active worker.

Recovery next-step guide: interrupted worker -> verify actual Git diff, BOARD Next and latest receipt before resuming; failed verification with exhausted budget -> block and show failure evidence plus one human decision needed; source changed but ticket transition failed -> keep source, run consistency/doctor, reconcile the selected ticket before retrying its transition. Never infer a PASS from modified files.

For failed work, distinguish code defect (specific failing behavior and new repair hypothesis), environment/tool outage (check access/prerequisites, do not edit code), unclear requirement (ask Human), and exhausted/no-new-hypothesis (block with evidence). Keep the selected ticket's compact `## Attempts` entries as `symptom | hypothesis | change | outcome` only after meaningful failures; link to the original log instead of copying it. Before retry, compare the current symptom and proposed fix with prior entries. Same symptom plus same hypothesis/change without new evidence -> do not retry; block or ask Human. Never spend the one repair on blind repetition.

For failures, reconcile ticket `repairs_used` with cached `repairsUsed` using the higher count; default automatic repair budget is 1. Preserve prior attempts and any explicit Human-granted allowance. Resume after exhaustion only with an agreed correction and recorded allowance. Do not repeat the same attempt beyond the limit; return evidence and the smallest next action to Human.
