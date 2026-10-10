import type { HandoffNotifierPort, HandoffPayload } from "./ports.js";

export function createStdoutHandoffNotifier(): HandoffNotifierPort {
	return {
		notify(payload: HandoffPayload) {
			console.log(`Onion handoff

  url:    ${payload.url || "(Serve URL unavailable — run pnpm serve / enable Tailscale Serve)"}
  secret: ${payload.secret}
  port:   ${payload.controlPort}
  at:     ${payload.rotatedAt}

Unlock the dashboard with the secret (Control token).
`);
		},
	};
}
