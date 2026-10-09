# Handoff

Handoff transfers only the context needed to continue. The ticket and BOARD remain workflow truth; handoff is a cache.

## Role handoff

Use when the executor changes between roles, agents, or models. The next executor reads the ticket directly. Return only useful fields:

```text
Ticket / From / To
Result / Changed / Verification
Decisions / Blockers / Next
```

Omit empty fields, repeated ticket text, conversation history, and full logs. Same executor continuing into the next role needs no separate role-handoff document; update the ticket receipt and continue.

## Session handoff

Use when work will resume in another session, place, or device. Build it from the ticket, BOARD/state, and current Git status rather than rewriting the conversation:

```text
Project / Ticket / Time
Branch / HEAD / Worktree / Changed files
Current / Completed / Active / Next
Evidence / Decisions / Blockers
Resume: exact first steps
```

`npx acorn-kit handoff` prints the compact canonical workflow and Git snapshot. Empty Blocked sections and repeated transfer boilerplate are omitted; never omit actual blockers or the exact Next role. Before transfer, the current Agent adds only material `Completed`, `Evidence`, `Decisions`, and exact `Resume` steps, then writes or replaces project-root `handoff.md`. The CLI stays read-only because it cannot know conversation decisions. Root `handoff.md` is local and Git-ignored by Acorn.

Checkpoint durable state only at meaningful transitions: ticket creation, role start/result, `State` or `Next` change, block/interruption, or exhausted repair. Finalize the portable handoff when Human asks to stop or continue elsewhere, such as “여기까지”, “나중에 이어서”, “회사에서 계속”, or “세션 넘겨줘”. Do not write one after every edit or test.

On resume, read root `handoff.md` first when present, then verify it against actual Git, ticket, BOARD, and state before acting. After an unexpected interruption, recover from the last checkpoint and actual Git/BOARD state under `recovery.md`; silence is not a final handoff. A host stop hook may help but is never required for correctness.

Handoff does not carry source changes. Move code separately through an explicitly authorized Git/private transfer. Ticket records are local and Git-ignored, so copy or privately sync a portable handoff when changing devices. Never commit or push automatically.
