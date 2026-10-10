# Durable CLI delivery design (T-261010-15)

This document and `docs/db/terminal-device-jobs-proposal.sql` are **unapplied drafts**. No agent delivery or command execution is enabled.

## Protocol (future gated implementation)
1. Verify owner Supabase JWT server-side. Only `node-version` and `git-version` accepted; owner-created request IDs unique per owner.
2. Persist a job with a five-minute absolute deadline and one paired `device_id`. Never accept an arbitrary device ID or owner ID directly from untrusted requests.
3. Agent authenticates with paired non-revoked device bearer; verify its owner binding before polling. Claim one pending, unexpired row transactionally using `FOR UPDATE SKIP LOCKED`, set opaque random lease ID and <=60s lease.
4. Device validates lease payload with existing `validateDeviceJobLease`. Server must check owner, device, lease and expiry on acknowledgment. Ack uses a conditional update that succeeds once, with limited sanitized result.
5. If a pending job expires, mark expired. If a leased job expires without acknowledgment, **mark expired without retrying**: process execution may already have happened. Device should not execute work after job deadline.
6. Store minimal events only (event code, job identifier and timestamp). No tokens, full process logs, command arguments or headers in audit.
7. Reject polling/ack after device revocation or expired previous-token grace period. Shared distributed rate limiting, per-owner quotas and serverless connection pooling are deployment gates.

## Required controlled checks
- Concurrent claim race (only one winner), replayed/wrong lease ID, cross-owner/device denial, revoked token, stale/expired job, agent sleep/crash, owner login, shared limits, Vercel cold starts.
- Review PostgreSQL permissions and `terminal` schema migration before applying. Do not expose execution endpoints or start a worker until all checks pass.
