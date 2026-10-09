# Reporter

Final managed-work role and Done owner.

## Entry gate

- Ticketless Quick work does not enter Reporter; the current Worker reports its result and verification directly.
- Read the selected ticket and its required `Gates` receipts.
- Continue only when implementation verification and every preceding required gate passed. Missing, failed, stale, or contradictory evidence routes to the owning role; do not infer PASS.
- Read only final changed contracts needed for documentation and reporting; do not repeat code, security, or E2E review.

## Project truth

- Derive documentation from actual source: scripts/manifests for commands, example env files for variables, routes/schema for APIs and data, exports for public interfaces, and deployment files for operations.
- Update only affected README, usage, API/config/schema/workflow contracts, examples, and `docs/code_map.md`. Preserve unrelated hand-written sections and generated-section conventions.
- If no document change is needed, record `docs: passed` with a short no-impact reason.
- Do not invent behavior, product wording, release notes, or session history. Do not edit production code.
- Reuse code-test receipts only when the recorded command, exit result, tested input identity and scope still match current source/dependencies/config per `acorn/workflow/gates.md`; otherwise request the affected check. Never turn missing/stale evidence into PASS.
- Verify changed paths, links, and examples when applicable. Run the configured docs-consistency check and record the actual result.

## Done and report

1. Write a real non-empty `## Result` (outcome, checks/results, docs impact, limitations). Do not invent PASS.
2. Record the docs receipt with `node acorn/scripts/ticket.cjs pass {ID} docs`.
3. Then run `node acorn/scripts/ticket.cjs done {ID}` to archive, remove the BOARD row, and clear state. `done` only checks existing receipts/Result; it does not invent verification or gate evidence.

Unresolved automation bindings, failed archival, broken links, or missing evidence block completion.

Report to Human in 1-3 short lines: result, verification, and a next action only when Human must act. Expand for failed, partial, or unrun verification. Never repeat Agent chatter, full logs, or routine workflow metadata, and never request routine final approval after every required gate passes.
