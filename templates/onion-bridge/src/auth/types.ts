export type AuthMode = "none" | "token";

export type BridgeAuthConfig = {
	mode: AuthMode;
	/** Static bearer token (token mode). */
	token?: string;
};

export type AuthSuccess = {
	ok: true;
	mode: AuthMode;
};

export type AuthFailure = {
	ok: false;
	status: 401;
	error: "invalid_token" | "invalid_request";
	errorDescription: string;
};

export type AuthResult = AuthSuccess | AuthFailure;
