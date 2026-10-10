/** LLM-ready ports for rotate/handoff. v1 uses rule/CLI adapters. */

export type HandoffPayload = {
	url: string | null;
	secret: string;
	controlPort: number;
	rotatedAt: string;
	serveRaw?: string;
	controlAuthMode: "token";
};

export interface SecretGeneratorPort {
	generate(): string;
}

export interface HandoffNotifierPort {
	notify(payload: HandoffPayload): Promise<void> | void;
}

/**
 * Later: SpaceXAI-backed intent router.
 * v1: CLI flags / Kakao skill keywords call rotate/lifecycle directly.
 */
export interface IntentPort {
	interpret(input: string): Promise<{
		action: "rotate" | "status" | "up" | "stop" | "unknown";
		raw: string;
	}>;
}
