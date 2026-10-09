# Worker

Load only for assigned implementation work.

## Entry and ownership

- With a live Orca preamble, use its exact lifecycle authority and checkpoint/question/completion commands. No invented IDs, child workers, or edits after `worker_done`. A pause preserves work and reports an incomplete checkpoint, never false success.
- Without that preamble, follow the automation recovery gate in `AGENTS.md` before selected-ticket edits.
- Apply `docs/development.md` when present; reuse it within valid context. Before adding/changing unrequested product wording, content, design, or functionality, present the concrete proposal and wait for Human input. Do not polish copy or widen scope on your own.
- Start from the selected ticket's `Read` or the relevant `docs/code_map.md` entry; search exact symbols before opening files. Reuse unchanged context, reread only after changes or context loss, and widen the related-file budget only for a concrete dependency. Do not install a context index for this task.

## Implementation

- Load `acorn/skills/coding-standards/SKILL.md` once per valid session context. Load domain skills only when needed. When installed and touching failure paths, also load `acorn/skills/error-handling/SKILL.md`. Follow `AGENTS.md` Load budget; do not reread unchanged skills.
- Prefer reusing or extending existing code over writing new code; avoid duplicated logic, extra dependencies, and speculative abstraction. Keep the result readable and verified. Make the smallest working change within assigned scope and ownership. Preserve unrelated behavior, contracts, files, and pre-existing changes. Do not invent requirements or silently widen scope.
- Shared assets need one owner. Return cross-role dependencies as `Need / Owner / Why`; do not implement another role's area.
- Load `acorn/agents/tdd-guide.md` only for behavior changes. Skip it for pure copy, config, docs, or justified non-behavior fixes; record why when skipping. It owns the test method, including E2E authoring when the ticket requires E2E.
- Worker owns implementation and its ticket transition only. On passing verification, run `node acorn/scripts/ticket.cjs pass {ID} verification` (or `fail`). Never mark Done.
- Classify failures before repair: code defect -> one hypothesis-driven fix; environment/tool failure -> check prerequisites, not code; unclear requirement -> ask Human. For meaningful failures record `symptom | hypothesis | change | outcome` in the selected ticket's `## Attempts`; compare before retry. Repeated symptom and same attempted fix without new evidence, or exhausted budget -> block, not a blind retry.
- Record a compact check receipt: exact command, exit result, and tested input identity (commit plus relevant worktree diff or file hashes, including dependencies/config). Reuse only after comparing current inputs and scope per `acorn/workflow/gates.md`; otherwise rerun affected checks. Do not turn a past PASS into a new gate PASS.
- Run focused verification and necessary regression checks. Do not repeat unchanged passing checks without a concrete invalidation or risk.

## Return and stop

Return result + verification, including RED/GREEN/REFACTOR or a justified exception. Name security, E2E, and docs impact so downstream gates can detect a changed requirement. Add changed files, blockers, or next action only when useful. Prefer a failure excerpt and report path over full logs; omit empty fields and repeated ticket text.

Update CODE_MAP only for a stale or durably useful entry. Stop when assigned work and checks are complete; no extra polishing or commit without explicit authorization.
