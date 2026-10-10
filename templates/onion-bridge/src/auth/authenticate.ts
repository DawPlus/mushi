import type { AuthResult, BridgeAuthConfig } from "./types.js";

export function extractBearerToken(
	authorization: string | undefined,
): string | null {
	if (!authorization) return null;
	const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
	return match?.[1]?.trim() || null;
}

export async function authenticateMcpRequest({
	authorization,
	auth,
}: {
	authorization?: string;
	body?: unknown;
	auth: BridgeAuthConfig;
}): Promise<AuthResult> {
	if (auth.mode === "none") {
		return { ok: true, mode: "none" };
	}

	const token = extractBearerToken(authorization);

	if (!auth.token) {
		return {
			ok: false,
			status: 401,
			error: "invalid_token",
			errorDescription: "Server token is not configured.",
		};
	}
	if (!token || token !== auth.token) {
		return {
			ok: false,
			status: 401,
			error: "invalid_token",
			errorDescription: "Missing or invalid bearer token.",
		};
	}
	return { ok: true, mode: "token" };
}
