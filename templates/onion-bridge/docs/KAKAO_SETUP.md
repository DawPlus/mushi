# KakaoTalk setup

Onion sends Serve URL + control secret via Kakao **나에게 보내기**, and can answer an Open Builder chatbot skill.

**Never commit** `~/.onion-bridge/kakao.json`.

## 1) Fill local config (now)

```bash
cp docs/kakao.json.example ~/.onion-bridge/kakao.json
chmod 600 ~/.onion-bridge/kakao.json
```

Edit `~/.onion-bridge/kakao.json`:

| Field | Value |
|-------|--------|
| `restApiKey` | Kakao Developers → 앱 키 → **REST API 키** |
| `clientSecret` | 보안에서 Client Secret 쓰면 값, 아니면 `""` |
| `redirectUri` | **정확히** `http://127.0.0.1:3848/kakao/callback` |
| `skillSecret` | (선택) 오픈빌더 웹훅 보호용 임의 문자열 |

## 2) Kakao Developers console

1. [developers.kakao.com](https://developers.kakao.com/) → 내 애플리케이션
2. **플랫폼 → Web**: 사이트 도메인 `http://127.0.0.1:3848` (및 `http://127.0.0.1:3847` 권장)
3. **카카오 로그인 ON**
4. Redirect URI 등록:
   - `http://127.0.0.1:3848/kakao/callback`
5. **동의항목**: `talk_message` (카카오톡 메시지 전송) 켜기
6. 제품 **카카오톡 메시지** 관련 설정/권한이 있으면 활성화

## 3) One-time login

```bash
pnpm build   # or npm run build
onion kakao login
```

브라우저에서 카카오 로그인·동의 → 토큰이 `kakao.json`에 저장됨.

테스트:

```bash
onion kakao test
```

카톡 **나와의 채팅**에 테스트 메시지가 오면 OK.  
(나에게 보내기는 알림이 약할 수 있음 → 채팅방 직접 확인.)

## 4) Rotate + Kakao notify

```bash
pnpm rotate -- --notify=kakao
# or:
onion rotate --notify=kakao
```

터미널 + 카톡으로 URL/Secret 전달.

## 5) Open Builder chatbot (optional)

1. [Kakao i Open Builder](https://chatbot.kakao.com/) 봇 생성
2. 스킬 서버 URL (Serve 켠 뒤):

```text
https://<your-magicdns>.ts.net/api/kakao/skill
```

3. 발화 예시: `비번`, `링크`, `서버 켜줘`, `서버 꺼줘`, `상태`
4. `skillSecret`을 썼다면 스킬 요청 헤더에  
   `X-Onion-Skill-Secret: <값>` 설정 (콘솔에서 커스텀 헤더 가능 여부는 빌더 UI 따름). 불가하면 skillSecret을 비워 두고 Serve를 tailnet-only로 유지.

집 PC에서 `pnpm up` 또는 `onion web` + `pnpm serve`가 떠 있어야 스킬이 응답함.

## Failure modes

| Symptom | Fix |
|---------|-----|
| restApiKey PASTE_… | kakao.json에 REST API 키 입력 |
| redirect mismatch | 콘솔 URI와 kakao.json `redirectUri` 완전 일치 |
| -402 / talk_message | 동의항목·앱 설정에서 메시지 권한 |
| token expired | `onion kakao login` 다시 |
| memo OK but no push | 나와의 채팅방 확인 (알림 약함) |

## LLM later

Skill routing uses `IntentPort` (v1 keywords). Later swap to SpaceXAI without changing Kakao send/rotate cores.
