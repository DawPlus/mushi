import {
	assertKakaoRestKey,
	loadKakaoConfig,
	saveKakaoConfig,
	type KakaoConfig,
} from "./config.js";

type TokenResponse = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
};

function formBody(data: Record<string, string>) {
	return new URLSearchParams(data).toString();
}

export function buildAuthorizeUrl(config: KakaoConfig): string {
	assertKakaoRestKey(config);
	const url = new URL("https://kauth.kakao.com/oauth/authorize");
	url.searchParams.set("client_id", config.restApiKey);
	url.searchParams.set("redirect_uri", config.redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "talk_message");
	return url.toString();
}

export async function exchangeAuthorizationCode(
	code: string,
	config?: KakaoConfig,
): Promise<KakaoConfig> {
	const current = config ?? (await loadKakaoConfig());
	assertKakaoRestKey(current);
	const body: Record<string, string> = {
		grant_type: "authorization_code",
		client_id: current.restApiKey,
		redirect_uri: current.redirectUri,
		code,
	};
	if (current.clientSecret) body.client_secret = current.clientSecret;

	const res = await fetch("https://kauth.kakao.com/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
		},
		body: formBody(body),
	});
	const json = (await res.json()) as TokenResponse;
	if (!res.ok || !json.access_token) {
		throw new Error(formatKakaoTokenError(json, res.status, current));
	}
	const next: KakaoConfig = {
		...current,
		accessToken: json.access_token,
		refreshToken: json.refresh_token || current.refreshToken,
		expiresAt: Date.now() + Number(json.expires_in || 21599) * 1000,
	};
	await saveKakaoConfig(next);
	return next;
}

function formatKakaoTokenError(
	json: TokenResponse,
	status: number,
	config: KakaoConfig,
): string {
	const base =
		json.error_description ||
		json.error ||
		`Kakao token exchange failed (${status})`;
	if (/bad client credentials|invalid_client/i.test(base)) {
		return `${base}

Kakao rejected client_id/client_secret.
Check:
  1) restApiKey must be 【REST API 키】 (not JavaScript / Native / Admin key)
  2) If console 보안 → Client Secret is ON, put that value in clientSecret
  3) No spaces/quotes around the key in ~/.onion-bridge/kakao.json
  4) redirectUri exact match: ${config.redirectUri}
Then: onion kakao login`;
	}
	return base;
}

export async function refreshAccessToken(
	config?: KakaoConfig,
): Promise<KakaoConfig> {
	const current = config ?? (await loadKakaoConfig());
	assertKakaoRestKey(current);
	if (!current.refreshToken) {
		throw new Error("No Kakao refreshToken. Run: onion kakao login");
	}
	const body: Record<string, string> = {
		grant_type: "refresh_token",
		client_id: current.restApiKey,
		refresh_token: current.refreshToken,
	};
	if (current.clientSecret) body.client_secret = current.clientSecret;

	const res = await fetch("https://kauth.kakao.com/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
		},
		body: formBody(body),
	});
	const json = (await res.json()) as TokenResponse;
	if (!res.ok || !json.access_token) {
		throw new Error(formatKakaoTokenError(json, res.status, current));
	}
	const next: KakaoConfig = {
		...current,
		accessToken: json.access_token,
		refreshToken: json.refresh_token || current.refreshToken,
		expiresAt: Date.now() + Number(json.expires_in || 21599) * 1000,
	};
	await saveKakaoConfig(next);
	return next;
}

export async function getValidAccessToken(): Promise<string> {
	let config = await loadKakaoConfig();
	assertKakaoRestKey(config);
	if (!config.accessToken) {
		throw new Error("No Kakao accessToken. Run: onion kakao login");
	}
	const skewMs = 60_000;
	if (config.expiresAt && Date.now() > config.expiresAt - skewMs) {
		config = await refreshAccessToken(config);
	}
	return config.accessToken;
}

export async function sendMemoToMe(text: string, linkUrl?: string) {
	const accessToken = await getValidAccessToken();
	const url = linkUrl || "https://tailscale.com";
	const template = {
		object_type: "text",
		text: text.slice(0, 200),
		link: {
			web_url: url,
			mobile_web_url: url,
		},
	};
	const res = await fetch(
		"https://kapi.kakao.com/v2/api/talk/memo/default/send",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type":
					"application/x-www-form-urlencoded;charset=utf-8",
			},
			body: formBody({
				template_object: JSON.stringify(template),
			}),
		},
	);
	const json = (await res.json().catch(() => ({}))) as {
		result_code?: number;
		msg?: string;
		code?: number;
	};
	if (!res.ok || json.result_code !== 0) {
		throw new Error(
			json.msg ||
				`Kakao memo send failed (${res.status}${json.code != null ? ` code ${json.code}` : ""})`,
		);
	}
	return json;
}
