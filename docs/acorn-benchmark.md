# Acorn dogfood: Mushi baseline

**Status:** workflow and quality baseline documented; **real token savings unmeasured**. No comparable no-Acorn run or host usage counters were captured during the completed tasks. This report is not a claim of token reduction.

## What we actually observed

The Mushi project was initialized with Acorn and built in a pnpm workspace. The following ticket records were marked Done using the ticket CLI (see `docs/tickets/archive/2026-10/`):

| Ticket | Scope | Observed verification | Caveat |
| --- | --- | --- | --- |
| T-261008-02 | pnpm workspace | workspace listing, Acorn docs consistency | no package-level tests yet |
| T-261008-03 | Vite/React/TanStack Router | web build and typecheck | no browser E2E |
| T-261008-05 | shadcn wrappers and import boundary | build, lint; forbidden-import tests | cannot alone prove visual uniformity |
| T-261008-08 | Query/Jotai/Ky | build, lint, six web tests | network API mocked |
| T-261008-04 | NestJS basic API | API build/typecheck, unit test, live HTTP 200 | no deployed runtime |
| T-261008-06 | local API integration | live Ky/NestJS/CORS test, existing regression tests | no real browser E2E |
| T-261008-07 | offline Prisma/Auth preparation | `prisma validate`, app checks, local integration | no DB connection, Prisma runtime, login or migration |

**Observed friction, not quantified as repair rates:** initial TS generated-route ordering failure, TypeScript/ESLint version mismatch, NestJS ESM configuration fixes, a CORS preflight failure subsequently fixed, and Prisma install-script restrictions. These demonstrate why recording failure cause and actual gate evidence matters; they do not establish token waste or Acorn's relative performance. Ticket PASS receipts show workflow transitions, not independent human QA.

## Paired token trial protocol

Use one *small, concrete task* (e.g. add a guarded input or a real domain endpoint). Define exactly the same acceptance tests for both modes. Run on **two disposable copies of the same repository snapshot** so the second run cannot reuse the first run's edited files. Capture a Git commit/snapshot identifier and working-tree state before both runs (Mushi did not have an initialized Git repository during the initial dogfood). Keep model/version, reasoning effort, tool availability, package versions, system rules, task wording and maximum repair allowance identical. Repeat with task order alternated at least three times, preferably with several different tasks.

1. **Control:** identical development request and quality checks, but without loading Acorn's project agent guidance, ticket lifecycle, or Acorn-specific task context. Keep generic safety/quality requirements equal.
2. **Acorn:** enable `AGENTS.md` and the selected Quick/Managed flow; follow ticket role and gate rules. Do not preload unrelated guides.
3. For each run, obtain *host-provided* input tokens, output tokens, cached tokens if available, model, and billable cost if provided. Include **all agent turns, tool responses, test reruns, and review/repair phases** up to the same Done criterion. Never estimate actual tokens from text length or CLI log bytes.
4. Count observed attempts, test failures, accepted test outcomes, unintended changes, extra source/docs files opened, manual interventions and gate violations. Time is optional and measured only with a real timer.
5. If host counters are unavailable, record **N/A** for token metrics. Do not infer savings from successful tests or a smaller handoff.

### Trial log (one row per actual run)

| Task/snapshot | Mode | Model/effort | Input tokens | Output tokens | Cache tokens | Cost | Tests | Repairs | Reopened/extra files | Gate misses | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Not run | Control | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Pending |
| Not run | Acorn | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Pending |

Compute token saving only on comparable measured paired runs: `(control_total_tokens - acorn_total_tokens) / control_total_tokens × 100%`. Report separate input/output totals, median across repeats, and any quality regressions. If completion quality differs, do **not** label the lower-token run a win. Dollar comparison needs actual billable amounts and cached-token treatment.

## Acceptance and quality scorecard

- **Functional correctness:** predeclared relevant unit/integration/build checks, same assertions in both modes, and independent browser/human QA when the task calls for it.
- **Workflow adherence:** accurate `Next`, declared verification and review receipts, documented Result, archived Done and docs consistency; never invent an unexecuted gate.
- **Maintainability:** small scoped changes, no redundant packages or unused abstraction, Mushi's common-UI boundary enforced, security and secrets respected.
- **Rework:** attempted fixes, repeat failures with the same hypothesis, rerun count and Human interventions. Use the ticket's `## Attempts` and tool evidence when available.
- **Context cost:** extra unrelated document reads, redundant role-guide loading and handoff bulk, **separate** from real billed token measurements.

## Improvement feedback

1. **High:** Host-token measurements need explicit capture at runtime. Acorn cannot compute real savings from ticket metadata alone; the next controlled task should record host-provided usage.
2. **High:** Initial Mushi had no Git repository, so source-state provenance and independent code-diff review were unavailable. Before the next comparative trial, create controlled identical snapshots (do not initialize/commit automatically as part of this measurement document).
3. **Medium:** Existing cross-boundary HTTP tests are useful, but do not establish browser behavior or UI consistency. Add browser/human QA when the feature warrants it.
4. **Medium:** Track a concise actual failure/repair log, rather than treating CLI `repairs_used: 0` as proof that no troubleshooting occurred.
5. **Keep:** The small ticket, role routing, explicit Result, targeted verification and shadcn import-boundary rule. Evaluate whether these reduce total cost *without* skipping checks.

**Next action:** choose a new feature with executable acceptance, capture two genuinely comparable runs with host usage, and update this file with measured data. Until then, token-saving score is **unknown**, not 0% and not a claimed improvement.
