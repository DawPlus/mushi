import type { Request, Response } from "express";
import { rotateControlSecret } from "../handoff/rotate.js";
import { createKeywordIntentPort } from "../handoff/keywordIntent.js";
import {
	getLifecycleStatus,
	stopLifecycle,
	upLifecycle,
} from "../runtime/lifecycle.js";
import { createKakaoHandoffNotifier } from "./notifier.js";

function skillText(text: string) {
	return {
		version: "2.0",
		template: {
			outputs: [{ simpleText: { text } }],
		},
	};
}

function utteranceFromBody(body: unknown): string {
	if (!body || typeof body !== "object") return "";
	const userRequest = (body as { userRequest?: { utterance?: string } })
		.userRequest;
	return String(userRequest?.utterance || "").trim();
}

/**
 * Kakao i Open Builder skill webhook handler.
 */
export async function handleKakaoSkill(req: Request, res: Response) {
	try {
		const utterance = utteranceFromBody(req.body);
		const intent = await createKeywordIntentPort().interpret(utterance);

		if (intent.action === "status") {
			const status = await getLifecycleStatus();
			res.json(
				skillText(
					[
						`web: ${status.web.running ? "UP" : "DOWN"}`,
						`serve: ${status.serve.active ? "UP" : "DOWN"}`,
						`url: ${status.serve.url || "-"}`,
						`auth: ${status.controlAuthMode} (ready=${status.controlAuthReady})`,
					].join("\n"),
				),
			);
			return;
		}

		if (intent.action === "up") {
			const status = await upLifecycle();
			res.json(
				skillText(
					`서버 켰음.\nurl: ${status.serve.url || "(serve 확인 필요)"}\nauth ready: ${status.controlAuthReady}`,
				),
			);
			return;
		}

		if (intent.action === "stop") {
			await stopLifecycle();
			res.json(skillText("web + Tailscale Serve 내렸음."));
			return;
		}

		if (intent.action === "rotate") {
			const payload = await rotateControlSecret({
				notifier: createKakaoHandoffNotifier({ alsoStdout: false }),
			});
			res.json(
				skillText(
					`새 Secret 발급.\nURL: ${payload.url || "-"}\nSecret: ${payload.secret}\n(카톡 나에게 보내기도 전송)`,
				),
			);
			return;
		}

		res.json(
			skillText(
				'알아들은 명령: "비번/링크", "서버 켜줘", "서버 꺼줘", "상태"',
			),
		);
	} catch (error) {
		res.json(
			skillText(
				`오류: ${error instanceof Error ? error.message : String(error)}`,
			),
		);
	}
}
