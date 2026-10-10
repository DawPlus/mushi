import http from "node:http";
import { spawn } from "node:child_process";
import {
	buildAuthorizeUrl,
	exchangeAuthorizationCode,
} from "./client.js";
import { loadKakaoConfig } from "./config.js";

function openBrowser(url: string) {
	const cmd =
		process.platform === "darwin"
			? "open"
			: process.platform === "win32"
				? "cmd"
				: "xdg-open";
	const args =
		process.platform === "win32" ? ["/c", "start", "", url] : [url];
	spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

export async function runKakaoLogin(): Promise<void> {
	const config = await loadKakaoConfig();
	const authorizeUrl = buildAuthorizeUrl(config);
	const redirect = new URL(config.redirectUri);
	if (redirect.hostname !== "127.0.0.1" && redirect.hostname !== "localhost") {
		throw new Error(
			`redirectUri must be localhost for CLI login. Got: ${config.redirectUri}`,
		);
	}
	const port = Number(redirect.port || 80);
	const callbackPath = redirect.pathname || "/kakao/callback";

	await new Promise<void>((resolve, reject) => {
		const server = http.createServer(async (req, res) => {
			try {
				const reqUrl = new URL(req.url || "/", `http://127.0.0.1:${port}`);
				if (reqUrl.pathname !== callbackPath) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}
				const error = reqUrl.searchParams.get("error");
				if (error) {
					res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
					res.end(`Kakao login error: ${error}`);
					server.close();
					reject(new Error(error));
					return;
				}
				const code = reqUrl.searchParams.get("code");
				if (!code) {
					res.writeHead(400);
					res.end("Missing code");
					return;
				}
				await exchangeAuthorizationCode(code, config);
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(
					"<h1>Onion Kakao login OK</h1><p>You can close this tab and run <code>onion kakao test</code>.</p>",
				);
				server.close();
				resolve();
			} catch (error) {
				res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
				res.end(error instanceof Error ? error.message : String(error));
				server.close();
				reject(error);
			}
		});
		server.on("error", reject);
		server.listen(port, "127.0.0.1", () => {
			console.log(`[kakao] waiting for callback on ${config.redirectUri}`);
			console.log(`[kakao] opening browser…`);
			console.log(authorizeUrl);
			openBrowser(authorizeUrl);
		});
	});
	console.log("[kakao] tokens saved to ~/.onion-bridge/kakao.json");
}
