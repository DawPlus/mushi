import { readFile } from "node:fs/promises";
import { startControlServer } from "./control/server.js";
import {
	applyWebTailscaleServe,
	printTailscaleServePlan,
} from "./remote/tailscaleServe.js";
import { rotateControlSecret } from "./handoff/rotate.js";
import { sendMemoToMe } from "./kakao/client.js";
import { runKakaoLogin } from "./kakao/login.js";
import { createKakaoHandoffNotifier } from "./kakao/notifier.js";
import {
	printLifecycleStatus,
	stopLifecycle,
	upLifecycle,
} from "./runtime/lifecycle.js";
import { startBridge } from "./server.js";
import { listProfiles, runSetup } from "./setup.js";

const args = process.argv.slice(2);
const first = args[0];

if (["-v", "--version"].includes(first)) {
	const { version } = JSON.parse(
		await readFile(new URL("../package.json", import.meta.url), "utf8"),
	);
	console.log(version);
	process.exit(0);
}

if (["-h", "--help", "help"].includes(first)) {
	printHelp();
	process.exit(0);
}

let action: Promise<unknown>;

if (first === "setup") {
	action = runSetup(args[1] || "default");
} else if (first === "profiles") {
	action = printProfiles();
} else if (first === "web") {
	action = startControlServer();
} else if (first === "remote") {
	action = printTailscaleServePlan();
} else if (first === "serve") {
	action = applyWebTailscaleServe();
} else if (first === "status") {
	action = printLifecycleStatus();
} else if (first === "stop") {
	action = stopLifecycle();
} else if (first === "up") {
	action = upLifecycle();
} else if (first === "rotate") {
	action = rotateControlSecret({
		ensureUp: !args.includes("--no-up"),
		notifier: args.includes("--notify=kakao")
			? createKakaoHandoffNotifier()
			: undefined,
	});
} else if (first === "kakao") {
	const sub = args[1];
	if (sub === "login") {
		action = runKakaoLogin();
	} else if (sub === "test") {
		action = sendMemoToMe(
			`[Onion Bridge] Kakao test OK\n${new Date().toISOString()}`,
		).then(() => {
			console.log("[kakao] test memo sent (나에게 보내기). Check KakaoTalk.");
		});
	} else {
		console.error("사용법: onion kakao login | onion kakao test");
		process.exit(1);
	}
} else if (first === "start") {
	action = args[1]
		? startBridge(args[1])
		: startBridge("default", process.cwd());
} else if (!first) {
	action = startBridge("default", process.cwd());
} else if (first.startsWith("-")) {
	console.error(`알 수 없는 옵션: ${first}`);
	printHelp();
	process.exit(1);
} else {
	action = startBridge(first);
}

action.catch((error) => {
	console.error(
		`[onionBridge] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
});

async function printProfiles() {
	const profiles = await listProfiles();
	if (!profiles.length) {
		console.log("저장된 Onion 프로필이 없습니다.");
		return;
	}
	for (const profile of profiles) console.log(profile);
}

function printHelp() {
	console.log(`🧅 Onion Bridge

사용법:
  onion
    기본(default) Tunnel 설정을 사용해 바로 실행합니다.
    workspace는 onion을 실행한 현재 폴더를 사용합니다.
    최초 실행에서만 기본 설정을 만들고, 이후에는 다시 묻지 않습니다.

  onion <profile>
    지정한 프로필을 실행합니다.

  onion web
    로컬 웹 제어 API(및 빌드된 UI)를 띄웁니다.

  onion remote
    집 밖 접속용 Tailscale Serve 명령/체크리스트를 출력합니다.
    자세한 절차: docs/REMOTE_ACCESS.md

  onion serve
    웹 UI용 Tailscale Serve만 켭니다 (pnpm serve).
    예: tailscale serve --bg http://127.0.0.1:<controlPort>

  onion status
    web + Tailscale Serve 가 켜져 있는지 표시합니다 (pnpm status).

  onion up
    web을 백그라운드로 띄우고 Tailscale Serve까지 켭니다 (pnpm up).

  onion stop
    web을 종료하고 Tailscale Serve를 끕니다 (pnpm stop).

  onion rotate
    Control token을 새로 만들고(단어+숫자+단어, 최대 10자) 저장한 뒤
    web+Serve를 맞추고 URL+secret을 출력합니다 (pnpm rotate).
    --no-up 이면 Serve/web 기동은 건너뜁니다.
    --notify=kakao 이면 카톡 나에게 보내기도 전송합니다.

  onion kakao login
    카카오 OAuth 로그인 후 토큰을 ~/.onion-bridge/kakao.json 에 저장합니다.

  onion kakao test
    나에게 보내기 테스트 메시지를 보냅니다.

  onion setup
    기본(default) 프로필을 생성하거나 수정합니다.

  onion setup <profile>
    새 프로필을 만들거나 기존 프로필을 수정합니다.
    workspace를 지정하고, Tunnel ID를 비우면 default 값을 재사용합니다.

  onion profiles
    저장된 프로필 목록을 봅니다.

여러 Onion을 동시에 띄우고 싶나요?
  프로필을 여러 개 만든 뒤 각각 실행하세요.

  예:
    onion setup frontend
    onion setup backend

  동시에 독립 연결로 사용할 프로필은 서로 다른 OpenAI Tunnel ID를 사용하세요.
  MCP port와 Bearer token은 Onion이 자동으로 관리합니다.

기타:
  onion -v, --version
  onion -h, --help`);
}
