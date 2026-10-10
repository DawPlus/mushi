import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { authenticateMcpRequest } from "./authenticate.js";
import { buildWwwAuthenticate } from "./challenge.js";
import type { AuthFailure, AuthResult, BridgeAuthConfig } from "./types.js";

@Injectable()
export class AuthService {
	async authenticateRequest(
		req: Request,
		auth: BridgeAuthConfig,
	): Promise<AuthResult> {
		return authenticateMcpRequest({
			authorization: req.headers.authorization,
			auth,
		});
	}

	writeAuthFailure(res: Response, failure: AuthFailure): void {
		res.setHeader(
			"WWW-Authenticate",
			buildWwwAuthenticate({
				error: failure.error,
				errorDescription: failure.errorDescription,
			}),
		);
		res.status(failure.status).json({
			error: failure.error,
			error_description: failure.errorDescription,
		});
	}
}
