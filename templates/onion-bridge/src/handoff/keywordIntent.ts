import type { IntentPort } from "./ports.js";

/**
 * v1 rule IntentPort. Swap later for SpaceXAI-backed intent.
 */
export function createKeywordIntentPort(): IntentPort {
	return {
		async interpret(input: string) {
			const raw = String(input || "").trim();
			const text = raw.toLowerCase();
			if (!text) return { action: "unknown", raw };

			if (
				/(꺼|중지|stop|down|종료)/i.test(raw) &&
				/(서버|serve|web|onion)/i.test(raw)
			) {
				return { action: "stop", raw };
			}
			if (
				/(켜|시작|올려|up|on)/i.test(raw) &&
				/(서버|serve|web|onion)/i.test(raw)
			) {
				return { action: "up", raw };
			}
			if (/(상태|status|살아|켜져)/i.test(raw)) {
				return { action: "status", raw };
			}
			if (/(비번|시크릿|secret|토큰|token|링크|link|rotate|로테|갱신)/i.test(raw)) {
				return { action: "rotate", raw };
			}
			return { action: "unknown", raw };
		},
	};
}
