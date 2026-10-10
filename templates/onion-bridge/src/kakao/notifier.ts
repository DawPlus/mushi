import type { HandoffNotifierPort, HandoffPayload } from "../handoff/ports.js";
import { createStdoutHandoffNotifier } from "../handoff/stdoutNotifier.js";
import { sendMemoToMe } from "./client.js";

export function formatHandoffMessage(payload: HandoffPayload): string {
	const url = payload.url || "(Serve URL 없음 — pnpm serve / Tailscale Serve 확인)";
	return [
		"[Onion Bridge]",
		`URL: ${url}`,
		`Secret: ${payload.secret}`,
		`Port: ${payload.controlPort}`,
		`At: ${payload.rotatedAt}`,
		"",
		"대시보드 잠금해제에 Secret(Control token)을 입력하세요.",
		"(나에게 보내기는 알림이 약할 수 있어요. 채팅방도 확인)",
	].join("\n");
}

export function createKakaoHandoffNotifier(options?: {
	alsoStdout?: boolean;
}): HandoffNotifierPort {
	const stdout = createStdoutHandoffNotifier();
	return {
		async notify(payload: HandoffPayload) {
			if (options?.alsoStdout !== false) {
				await stdout.notify(payload);
			}
			const text = formatHandoffMessage(payload);
			await sendMemoToMe(text, payload.url || undefined);
			console.log("[kakao] sent handoff to KakaoTalk (나에게 보내기)");
		},
	};
}
