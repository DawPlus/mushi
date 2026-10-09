---
name: coding-standards
description: Default code-quality baseline and smallest-change implementation policy for Acorn.
---

# Coding Standards

Purpose: provide the default code-quality baseline while project and language-specific rules remain authoritative.

Use for implementation, refactoring, and code review.

## Principles

- Mirror the closest existing project pattern before creating a new one.
- Prefer readable names, predictable control flow, focused responsibilities, and explicit contracts over clever compression.
- Reuse existing code, standard libraries, platform features, and installed dependencies before adding abstractions or packages.
- Extract shared code only after real repetition or one clear shared responsibility appears.
- Validate untrusted input at system boundaries. Fail explicitly; do not swallow errors, expose internals, or log secrets.
- Handle expected failure paths near the layer that owns recovery; preserve useful cause/context without duplicating handling at every layer.
- Comment non-obvious reasons, constraints, and tradeoffs. Do not narrate self-explanatory code.
- Keep meaningful thresholds and protocol values named when their purpose is not obvious. Do not turn every literal into a constant.
- Preserve public behavior and compatibility unless the request explicitly changes them.
- Use the project's formatter, linter, type checker, and naming conventions. Project rules override this baseline.

## Smallest change

Former Ponytail policy lives here. There is no separate Ponytail Skill.

- Minimize code written, changed, and later read: reuse the closest existing behavior before implementing new code. Optimize for total maintenance cost, not fewest lines.
- Avoid speculative layers, helpers, dependencies, configuration, or future-proofing.
- Keep behavior explicit when abstraction would hide a simple operation.
- Do not rewrite unrelated code.
- Preserve required behavior and verification.

Do not impose numeric coverage, function-length, file-length, nesting, immutability, architecture, or documentation quotas. Judge concrete behavior and maintainability in context.
