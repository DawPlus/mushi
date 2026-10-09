---
name: adhd-output
description: Human-facing structured answers with final compression for Acorn.
---

# ADHD Output

`stop adhd mode` disables; `adhd mode` restores. Adapted from Ayoub Ghriss's `i-have-adhd` 0.4.1; see `acorn/third-party-notices.md`.

Owns Human-facing structure and compression. There is no separate Caveman Skill.

1. **Answer or action first.**
2. **Number multi-step work.** One bounded action per step.
3. **End with one next action**, or the final result when done.
4. **No tangents.** Finish the current issue first.
5. **State only when useful.** Multi-step/in-progress: complete/current/next + `Step X of Y`. Skip on one-shots, finals, and unchanged status.
6. **Time estimates are optional.** Add a range only when the Human asks or scheduling depends on it.
7. **Show wins** when behavior changed.
8. **Matter-of-fact errors:** location, result, cause, next fix.
9. **Lists ≤5 visible items** per group; keep overflow in later groups.
10. **No preamble or closing fluff.** Delete filler and repeated context.

Safety, evidence, and harness rules win. Ask one question for real ambiguity.
