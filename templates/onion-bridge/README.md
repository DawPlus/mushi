# 🧅 Onion Bridge

로컬 워크스페이스를 MCP 서버로 노출하고, 웹 대시보드·Tailscale 원격 접속·**카카오톡 연동(URL + Control secret 전달)** 까지 지원하는 Node.js CLI입니다.

```text
# ChatGPT 경로 (기존)
ChatGPT → OpenAI Secure MCP Tunnel ← tunnel-client → Onion Bridge → Workspace

# 집 밖 내 기기 + 카카오톡 경로 (추가)
폰/노트북(Tailscale) → Tailscale Serve → localhost:3847 (onion web)
                              ↑
              pnpm rotate --notify=kakao → 카톡 나에게 보내기 (URL + secret)
```

## 주요 기능

### MCP / ChatGPT
- 로컬 프로젝트 파일을 MCP로 읽고 수정
- 프로필별 workspace / MCP 포트 / Tunnel ID / Bearer token
- 여러 프로필 동시 실행 가능 (`tunnel-client` 실행 파일은 공유)
- MCP는 기본적으로 `127.0.0.1`에만 바인딩

### 웹 컨트롤 대시보드 (`onion web`)
- 프로젝트 on/off, 설정, 폴더 추가
- Control API 인증: `local`(기본) / `token`(원격용)
- NestJS + TypeScript 백엔드, React 웹 UI (`apps/web`)

### 원격 접속 (Tailscale Serve)
- Onion은 localhost 유지, Tailscale Serve가 HTTPS로 프록시
- `pnpm serve` / `pnpm up` / `pnpm status` / `pnpm stop`

### 카카오톡 연동 ⭐
- Control secret 자동 생성 (`단어+숫자+단어`, 최대 10자)
- Tailscale Serve URL + secret을 **카톡 나에게 보내기**로 전송
- 오픈빌더 스킬 웹훅으로 “비번 / 서버 켜줘 / 꺼줘 / 상태” 처리 가능
- 자세한 절차는 아래 [카카오톡 연동](#카카오톡-연동) 및 `docs/KAKAO_SETUP.md`

---

## 요구 사항

- Node.js 20+
- (ChatGPT용) OpenAI `tunnel-client`, Secure MCP Tunnel ID, OpenAI API key
- (원격용) [Tailscale](https://tailscale.com/) 앱 + CLI
- (카톡용) [Kakao Developers](https://developers.kakao.com/) 앱 + `talk_message` 동의

---

## 설치 / 빌드

```bash
git clone <repo>
cd Onion-Bridge
npm install          # 또는 pnpm install
npm run build

# 로컬에서 onion 명령 쓰려면
npm link
```

전역 예전 `onion`이 남아 있으면 `onion rotate`가 setup으로 잘못 들어갈 수 있습니다.  
그럴 때는 레포에서 실행하세요:

```bash
node ./bin/onionBridge.js rotate --notify=kakao
# 또는
pnpm rotate -- --notify=kakao
```

---

## 빠른 시작

### 1) ChatGPT MCP (기존)

```bash
onion setup default
onion
```

### 2) 웹 대시보드

```bash
pnpm web
# http://127.0.0.1:3847/
```

Settings에서 **Control auth mode = token**, Control token 저장 후 원격 사용.

### 3) 집 밖 접속 + 카톡으로 URL/비번 받기

```bash
# 카카오 1회 로그인 (아래 카카오톡 연동 참고)
pnpm kakao:login
pnpm kakao:test

# secret 갱신 + Serve 맞춤 + 카톡 전송
pnpm rotate -- --notify=kakao
```

카톡 **나와의 채팅**과 터미널에 `https://….ts.net/` + secret이 옵니다.  
같은 Tailscale 계정의 폰/노트북 브라우저에서 URL을 열고 secret으로 잠금 해제합니다.

---

## 카카오톡 연동

집 밖에서 대시보드에 들어갈 때 매번 주소를 외우거나 터미널을 볼 필요 없이,  
**매일/필요할 때 secret을 돌리고 카톡으로 URL+secret을 받는** 기능입니다.

### 동작 요약

```text
onion rotate --notify=kakao
  → Control secret 생성 (예: sky1lime)
  → ~/.onion-bridge/web.json 에 controlAuthMode=token, controlToken 저장
  → onion web 백그라운드 기동 (필요 시)
  → Tailscale Serve 연결
  → 터미널 출력 + 카카오톡 나에게 보내기
```

Secret 형식: `단어 + 숫자 + 단어`, **최대 10자** (예: `cat7dog`, `sky1lime`).

### 1. Kakao Developers 설정

1. [developers.kakao.com](https://developers.kakao.com/) → 애플리케이션 생성  
2. **앱 키**에서 **REST API 키** 복사 (JavaScript/Native/Admin 키 아님)  
3. **플랫폼 → Web** 도메인: `http://127.0.0.1:3848` (권장: `3847`도 추가)  
4. **카카오 로그인 ON**  
5. Redirect URI **정확히**:
   ```text
   http://127.0.0.1:3848/kakao/callback
   ```
6. **동의항목**: 카카오톡 메시지 전송 (`talk_message`) ON  
7. **보안 / Client Secret**  
   - 사용함(ON)이면 Secret 코드를 반드시 `kakao.json`의 `clientSecret`에 넣기  
   - 끄면 `clientSecret`은 `""`  
   - `Bad client credentials`(KOE010)는 대부분 Secret 누락/불일치

상세: [`docs/KAKAO_SETUP.md`](docs/KAKAO_SETUP.md)

### 2. 로컬 설정 파일

```bash
cp docs/kakao.json.example ~/.onion-bridge/kakao.json
chmod 600 ~/.onion-bridge/kakao.json
open -e ~/.onion-bridge/kakao.json
```

| 필드 | 설명 |
|------|------|
| `restApiKey` | REST API 키 |
| `clientSecret` | Client Secret 사용 시 코드, 아니면 `""` |
| `redirectUri` | `http://127.0.0.1:3848/kakao/callback` |
| `accessToken` / `refreshToken` | `kakao login`이 채움 |
| `skillSecret` | (선택) 오픈빌더 웹훅 보호 |

**이 파일은 git에 커밋하지 마세요.**

### 3. 로그인 · 테스트 · 전송

```bash
pnpm kakao:login    # 브라우저 동의 → 토큰 저장
pnpm kakao:test     # 나와의 채팅에 테스트 메시지

# 실제 handoff
pnpm rotate -- --notify=kakao
# 또는 (npm link 한 뒤)
onion rotate --notify=kakao
```

참고:
- 「나에게 보내기」는 **푸시 알림이 약할 수 있음** → 카톡 **나와의 채팅**을 직접 확인  
- Serve가 안 켜져 있으면 `pnpm serve` / Tailscale Serve 활성화 링크를 먼저 처리

### 4. 오픈빌더 챗봇 (선택)

집 PC에서 web+Serve가 떠 있는 동안, 카카오 오픈빌더 스킬 URL:

```text
https://<magicdns>.ts.net/api/kakao/skill
```

예: `https://doh-macmini.tailb1def6.ts.net/api/kakao/skill`

| 발화 예 | 동작 |
|---------|------|
| 비번, 링크, 토큰 | secret 로테이트 + 카톡 전송 + 답장 |
| 서버 켜줘 | web + Tailscale Serve up |
| 서버 꺼줘 | web stop + serve reset |
| 상태 | on/off + URL 요약 |

`skillSecret`을 쓰면 요청 헤더 `X-Onion-Skill-Secret`이 필요합니다.

### 5. 매일 자동 (launchd, 기본 10:00)

샘플 plist:

[`docs/launchd/com.onion-bridge.rotate.plist`](docs/launchd/com.onion-bridge.rotate.plist)

```bash
cp docs/launchd/com.onion-bridge.rotate.plist ~/Library/LaunchAgents/
# 필요 시 plist 안의 레포/pnpm 경로 수정
launchctl load ~/Library/LaunchAgents/com.onion-bridge.rotate.plist
```

매일 10시에 `pnpm rotate -- --notify=kakao` 실행 → 카톡으로 URL+secret.  
상세: [`docs/SECRET_ROTATION.md`](docs/SECRET_ROTATION.md)

---

## 원격 접속 (Tailscale)

Onion은 `0.0.0.0`으로 열지 않습니다. **Tailscale Serve → 127.0.0.1** 이 기본 경로입니다.

```bash
pnpm web                 # 또는 pnpm up
pnpm serve               # Serve만
pnpm status              # web / Serve on·off, URL
pnpm stop                # web 종료 + serve reset
pnpm remote              # 추천 명령 출력
```

외부 브라우저 주소 예:

```text
https://doh-macmini.tailb1def6.ts.net/
```

같은 Tailscale tailnet 기기에서만 접근 (Funnel 기본 사용 안 함).  
대시보드는 **Control token**으로 잠금 해제합니다.

더 자세한 런북: [`docs/REMOTE_ACCESS.md`](docs/REMOTE_ACCESS.md)

### ChatGPT Tunnel vs Tailscale

| 용도 | 경로 | Onion auth |
|------|------|------------|
| ChatGPT | OpenAI Secure MCP Tunnel | MCP `token` 모드(기본 static bearer) |
| 집 밖 내 브라우저/MCP 클라 | Tailscale Serve | 웹 `token` + MCP `token`(기본) |

---

## 웹 Control 인증

| 모드 | 의미 |
|------|------|
| `local` | API 인증 없음 (집 PC 전용 기본값) |
| `token` | `/api/*`에 Bearer 필요. 원격·카톡 로테이트 후 이 모드 |

설정: 대시보드 Settings, 또는

```bash
export ONION_CONTROL_AUTH_MODE=token
export ONION_CONTROL_TOKEN='…'
```

공개: `GET /api/health`, `GET /api/auth`  
보호: 나머지 `/api/*`  
UI는 token 모드에서 잠금 해제 화면 → `sessionStorage`에 토큰 보관.

---

## MCP 인증

모드: `token`(기본, static Bearer) | `none`.

```bash
export ONION_BRIDGE_AUTH_MODE=token   # 기본
# export ONION_BRIDGE_AUTH_MODE=none  # 비권장
```

ChatGPT Secure MCP Tunnel은 프로필 Bearer를 tunnel yaml에 넣는 `token` 모드를 사용합니다.  
(구 MCP OAuth/JWKS 모드는 제거됨 — 현재 사용 경로 없음.)

---

## CLI / pnpm 스크립트

```bash
# MCP
onion / onion <profile> / onion start [profile]
onion setup [profile]
onion profiles

# 웹 · 원격
onion web                 # pnpm web
onion serve               # pnpm serve
onion remote              # pnpm remote
onion status              # pnpm status
onion up                  # pnpm up
onion stop                # pnpm stop

# secret · 카카오
onion rotate [--no-up] [--notify=kakao]   # pnpm rotate
onion kakao login                         # pnpm kakao:login
onion kakao test                          # pnpm kakao:test

onion -h / -v
```

빌드 후 실행이 기본입니다 (`npm run build` 포함 스크립트).

---

## 설정 파일 위치

| 경로 | 내용 |
|------|------|
| `~/.onion-bridge/config.json` | 공유 tunnel-client 경로, API key 등 |
| `~/.onion-bridge/profiles/<name>.json` | 프로필 (workspace, port, token, tunnelId) |
| `~/.onion-bridge/web.json` | 웹 설정, controlAuthMode, controlToken |
| `~/.onion-bridge/kakao.json` | 카카오 REST 키·토큰 (**비밀, git 금지**) |
| `~/.onion-bridge/web.pid` | 백그라운드 web PID |
| tunnel-client `onion-<name>.yaml` | 생성되는 터널 프로필 |

---

## 아키텍처 메모

- 백엔드: NestJS + TypeScript (`src/**` → `dist/`), CLI는 `bin/onionBridge.js` → `dist/cli.js`
- 웹 UI: `apps/web` (React + TypeScript + Tailwind)
- 카톡/로테이트는 포트로 분리되어 있어 이후 LLM(Intent) 교체 가능  
  (`SecretGeneratorPort`, `HandoffNotifierPort`, `IntentPort`, Lifecycle)

관련 문서:

- [`docs/KAKAO_SETUP.md`](docs/KAKAO_SETUP.md) — 카카오 앱·로그인·트러블슈팅  
- [`docs/REMOTE_ACCESS.md`](docs/REMOTE_ACCESS.md) — Tailscale Serve  
- [`docs/SECRET_ROTATION.md`](docs/SECRET_ROTATION.md) — secret 로테이트·스케줄  
- [`docs/CODE_MAP.md`](docs/CODE_MAP.md) — 코드 진입점  
- [`docs/tickets/BOARD.md`](docs/tickets/BOARD.md) — 티켓 보드  

---

## 보안

- 파일 MCP 작업은 승인 없이 디스크에 반영됩니다. workspace를 필요한 범위로만 두세요.
- MCP·웹 모두 기본은 localhost; 원격은 Tailscale + control/MCP token.
- 카카오·control token·API key를 저장소에 넣지 마세요.
- 동일 workspace를 여러 에이전트가 쓰면 충돌 방지는 없습니다.

---

## 테스트

```bash
npm test
```

---

## Derived from GPT-Bridge

Onion Bridge is derived from [GPT-Bridge](https://github.com/dreamurl/GPT-Bridge).

## License

MIT
