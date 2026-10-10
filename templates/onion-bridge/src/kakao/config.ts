import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type KakaoConfig = {
	restApiKey: string;
	clientSecret: string;
	redirectUri: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	/** Optional shared secret for Open Builder → POST /api/kakao/skill */
	skillSecret?: string;
};

const DEFAULT_REDIRECT = "http://127.0.0.1:3848/kakao/callback";

export function kakaoConfigPath() {
	return path.join(os.homedir(), ".onion-bridge", "kakao.json");
}

export function emptyKakaoConfig(): KakaoConfig {
	return {
		restApiKey: "",
		clientSecret: "",
		redirectUri: DEFAULT_REDIRECT,
		accessToken: "",
		refreshToken: "",
		expiresAt: 0,
	};
}

export async function loadKakaoConfig(): Promise<KakaoConfig> {
	const file = kakaoConfigPath();
	try {
		const raw = JSON.parse(await fs.readFile(file, "utf8"));
		return {
			...emptyKakaoConfig(),
			...raw,
			restApiKey: String(raw.restApiKey || "").trim(),
			clientSecret: String(raw.clientSecret || "").trim(),
			redirectUri: String(raw.redirectUri || DEFAULT_REDIRECT).trim(),
			accessToken: String(raw.accessToken || "").trim(),
			refreshToken: String(raw.refreshToken || "").trim(),
			expiresAt: Number(raw.expiresAt || 0),
			skillSecret: raw.skillSecret ? String(raw.skillSecret).trim() : "",
		};
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ENOENT") {
			throw new Error(
				`Kakao config missing. Copy template:\n  cp ~/.onion-bridge/kakao.json.example ~/.onion-bridge/kakao.json\nThen set restApiKey. Path: ${file}`,
			);
		}
		throw error;
	}
}

export async function saveKakaoConfig(config: KakaoConfig): Promise<void> {
	const file = kakaoConfigPath();
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, `${JSON.stringify(config, null, 2)}\n`, {
		encoding: "utf8",
		mode: 0o600,
	});
}

export function assertKakaoRestKey(config: KakaoConfig): void {
	if (!config.restApiKey || config.restApiKey.includes("PASTE_")) {
		throw new Error(
			`Set restApiKey in ${kakaoConfigPath()} (Kakao Developers → 앱 키 → REST API 키).`,
		);
	}
}
