# Onion-Bridge Agent Guide

Installed by Acorn.

## Start

Read this file first. Do not preload `acorn/` or project docs.

Route from the user's current request and load only what that route needs:
- if `.acorn/roles.md` exists and the current work uses project-specific roles, read only the matching role entry; project override wins over Acorn defaults.
- normal question -> answer normally; no workflow state needed.
- tiny/local/low-risk change -> Quick: use the relevant `docs/CODE_MAP.md` area or local context index when useful, read only directly related files, change, focused verify, report. No ticket by default.
- work with coordination/risk or unclear classification -> `acorn/workflow/WORKFLOW.md`, then Coordinator.
- explicit ticket/session pick -> read that project-owned ticket, then the assigned worker guidance.
- returned worker completion report -> Coordinator review.
- continue/resume -> revalidate `acorn/state.json` against the configured ticket board, then load only the active ticket/role.
- explicit closeout request such as "문서정리 후 마무리" -> `acorn/workflow/CLOSEOUT.md`; if the close target is ambiguous, ask instead of guessing.
- interrupted/repeated failure -> `acorn/rules/recovery.md`.
- Acorn system/config question -> `acorn/ACORN.md` or `acorn/config.json` only as needed.

Discipline and optional routing:
- Human communication/reporting -> Caveman Ultra required; use installed skill or `acorn/skills/caveman/SKILL.md`.
- code Build/refactor/review -> Ponytail required; Worker owns loading with `acorn/skills/ponytail/SKILL.md` fallback.
- explicit `@acornBrain` or idea-to-ticket planning -> `acorn/skills/brain/SKILL.md`; Brain clarifies only blocking ambiguity and publishes project-owned tickets directly.
- Coordinator/planning/review -> `acorn/agents/coordinator.md`; load `acorn/PHILOSOPHY.md` only when planning depth or operating principles affect the decision.
- implementation -> `acorn/agents/worker.md`
- QA -> `acorn/agents/qa.md`
- autonomous confirmed-ticket execution -> `acorn/orchestration/ORCHESTRATION.md`
- final user summary -> `acorn/report/REPORT.md`
- always-applicable constraints when needed -> `acorn/rules/core.md`
- installed domain knowledge -> matching `acorn/skills/<name>/SKILL.md`
- project knowledge/memory/artifacts -> relevant project-owned docs/source outside `acorn/`

## Core Rules

- Natural language is the primary interface. Do not require the user to learn Acorn CLI commands.
- Keep Quick work ticketless by default; use `acorn/workflow/WORKFLOW.md` for detailed classification/escalation.
- Human and Agent are interchangeable executors. Treat Acorn roles as responsibilities, not fixed people or models; follow project-owned/configured assignments when they differ from defaults.
- Role boundaries are hard ownership boundaries. An assigned role must not implement another role's owned work; return cross-role needs to Coordinator.
- Do not scan directories or load unrelated Acorn/project docs by default.
- Do not preload ticket history, EOD history, or unrelated state.
- Revalidate cached state against project truth before resuming.
- Do not commit or publish unless the user explicitly asks.
- Verify with the smallest useful check and report failures or untested areas honestly.
- Keep project documentation outside `acorn/`.

Make the smallest useful next move.
