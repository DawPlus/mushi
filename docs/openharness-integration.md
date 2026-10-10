# OpenHarness integration (pending interface verification)

Mushi integrates with an existing OpenHarness installation; it must not install or duplicate OpenHarness. Its actual local interface and installation path have **not** been verified in this workspace. No API endpoints, CLI commands, or start/status/result behavior are assumed.

## Planned local-only adapter

1. On each Mac, configure the locally verified OpenHarness executable or supported API endpoint outside Git.
2. Probe the supported status interface locally without accepting a URL or executable path from browser requests.
3. Once the authorized outbound Mac connection and job queue (T-261009-02 / 06) exist, expose sanitized availability, job state, and results to the authenticated owner only.
4. Confirm exact version, supported operations, required permissions, cancellation semantics, and output redaction against the installed implementation before enabling any action.

## Setup checklist for another user

- Install or retain their own OpenHarness using its official instructions.
- Verify its supported CLI/API and record only the connection method in local configuration, never tokens in the repository.
- Register their Mac in their own Supabase project; establish authenticated outbound communication before requesting any OpenHarness action.
- Validate status, one harmless task, failure, timeout, and redacted output using the documented supported interface.

This page is a preparation checklist, not evidence of completed integration. No OpenHarness commands or network endpoints have been tested.
