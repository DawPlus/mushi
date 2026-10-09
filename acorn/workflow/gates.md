# Gates

Canonical gate map. Executable source: `acorn/scripts/ticket.cjs` (`GATES`). Do not duplicate the map elsewhere; reference this file.

| Gate | Receipt field | Next role | BOARD State |
| --- | --- | --- | --- |
| `code-review` | `code_review` | `code-reviewer` | `review` |
| `security` | `security_review` | `security-reviewer` | `review` |
| `e2e` | `e2e` | `e2e-runner` | `review` |
| `docs` | `docs` | `reporter` | `docs` |

Rules:

- Declared `Gates` are ordered and end with `docs`.
- Prefer `node acorn/scripts/ticket.cjs pass|fail|start|block|resume|new|done <ID> ...` to update BOARD, ticket frontmatter, and `acorn/state.json` together, then run the consistency check.
- Manual edits remain allowed only when they stay consistent with this map and pass `node acorn/scripts/check-docs-consistency.cjs --ticket {ID}`.
- Verification reuse is evidence-based, not a cache of `passed` alone. Record the exact command, exit result, and tested input identity (commit plus working-tree diff or hashes for relevant files, including dependency/config inputs). The later role compares this with the current inputs and declared acceptance scope. If any relevant input or required check changed, rerun the affected check; if provenance is missing, treat it as unverified. Never reuse an old receipt to bypass a new gate.
