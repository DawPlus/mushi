# Mac check-in agent

Run from the Mushi repository root:

```sh
node agent/checkin.mjs --once
node agent/checkin.mjs --watch
node --test agent/checkin.test.mjs
```

The agent sends one request or repeats every 90 seconds when explicitly started. Watch mode validates the destination and device credential before entering its loop, cleans up temporary signal listeners between checks, and stops promptly on SIGINT/SIGTERM. It does not auto-start; use an explicitly reviewed launchd service only if automatic startup is desired. It reuses Mushi's Mac metrics collector (Node 24 can import the existing TypeScript module) and the fixed localhost Onion Bridge probe; failures in either collector do not block a heartbeat. Only validated numeric system summaries and sanitized reachability are included, never process arguments, environment variables or arbitrary URLs. It uses a local ignored agent/.env containing a device token, device ID and API URL. Only HTTPS destinations or local loopback HTTP are accepted. It does not include database credentials, accept inbound connections, execute commands, or start on reboot. The monitor API is currently local-only, and cloud deployment is not enabled. Production token rotation, revocation, replay protection and rate limits must be completed before public exposure.

## Optional launchd configuration (opt-in; owner installed locally after approval)

Run `node agent/generate-launchd.mjs > ~/Library/LaunchAgents/local.mushi.mac-agent.plist` from the repo root **only after reviewing the output and opting in**. This generator only prints XML and never installs or enables a service. The template starts the watch agent when the user logs in; it intentionally does not restart automatically on failures, to avoid repeated authentication failures or surprise background work. Use `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.mushi.mac-agent.plist` to enable it manually after reviewing the plist and agent/.env. Unload with `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.mushi.mac-agent.plist`. Verify the Node runtime path (for example after upgrading Node). Do not store device tokens inside the plist.
