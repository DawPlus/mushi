import type { NextFunction, Request, Response } from "express";

export type ControlAuthMode = "local" | "token";

export type ControlAuthConfig = {
	mode: ControlAuthMode;
	token: string | null;
};

export function normalizeControlAuthMode(raw: unknown): ControlAuthMode {
	const mode = String(raw || "local").toLowerCase();
	if (mode === "token") return "token";
	if (mode === "local" || mode === "none") return "local";
	throw new Error(
		`Unsupported control auth mode "${raw}". Use local or token.`,
	);
}

export function resolveControlAuthConfig({
	mode,
	token,
	env = process.env,
}: {
	mode?: unknown;
	token?: unknown;
	env?: NodeJS.ProcessEnv;
} = {}): ControlAuthConfig {
	const resolvedMode = normalizeControlAuthMode(
		env.ONION_CONTROL_AUTH_MODE || mode || "local",
	);
	const resolvedToken =
		(typeof env.ONION_CONTROL_TOKEN === "string" &&
		env.ONION_CONTROL_TOKEN.trim()
			? env.ONION_CONTROL_TOKEN.trim()
			: null) ||
		(typeof token === "string" && token.trim() ? token.trim() : null);
	return { mode: resolvedMode, token: resolvedToken };
}

export function extractControlBearer(
	authorization: string | undefined,
	headerToken: string | undefined,
): string | null {
	if (typeof headerToken === "string" && headerToken.trim()) {
		return headerToken.trim();
	}
	if (!authorization) return null;
	const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
	return match?.[1]?.trim() || null;
}

export function assertControlAuthorized(
	req: Pick<Request, "headers">,
	auth: ControlAuthConfig,
): { ok: true } | { ok: false; status: 401; error: string } {
	if (auth.mode === "local") return { ok: true };
	if (!auth.token) {
		return {
			ok: false,
			status: 401,
			error: "Control token is not configured on the server.",
		};
	}
	const provided = extractControlBearer(
		typeof req.headers.authorization === "string"
			? req.headers.authorization
			: undefined,
		typeof req.headers["x-onion-control-token"] === "string"
			? req.headers["x-onion-control-token"]
			: undefined,
	);
	if (!provided || provided !== auth.token) {
		return {
			ok: false,
			status: 401,
			error: "Unauthorized",
		};
	}
	return { ok: true };
}

export function createControlAuthMiddleware(
	getAuth: () => ControlAuthConfig | Promise<ControlAuthConfig>,
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const auth = await getAuth();
			const result = assertControlAuthorized(req, auth);
			if (result.ok === false) {
				res.setHeader(
					"WWW-Authenticate",
					'Bearer realm="onion-control"',
				);
				res.status(result.status).json({ error: result.error });
				return;
			}
			next();
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};
}
