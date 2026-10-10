# EOD

Project-owned chronological work history. EOD is not handoff, memory, or workflow truth.

Create `docs/eod/eod-YYYY-MM-DD.md` only when a session leaves useful history: meaningful completed work, ticket movement, difficult investigation, runtime/operational findings, or important pending work.

Do not require EOD for ordinary tiny changes.

## Template

```md
# EOD YYYY-MM-DD

## Completed
- What materially finished.

## Ticket Updates
- Ticket IDs and meaningful state/Next changes.

## Pending
- What should continue later, with ticket/owner when known.

## Runtime Notes
- Deployment, DB, external-system, manual verification, or other operational facts worth preserving.
```

Use `- None` for an empty section.

## Rules

- Keep entries compact. Reference ticket IDs and authoritative project artifacts instead of copying them.
- EOD records what happened; it does not become the source of truth for requirements, contracts, decisions, or ticket state.
- Durable decisions belong in project memory or another authoritative project document.
- New sessions do not read EOD by default. Read a specific EOD only when history is needed for recovery or investigation.
- Handoff may point to relevant EOD history, but must remain a compact continuation view.
