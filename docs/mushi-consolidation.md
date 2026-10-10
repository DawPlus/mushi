# Mushi 내부 기능 통합

- Mushi 웹(앱: `apps/web`): `/monitor`, `/terminal`, `/agents`, `/automation`은 Mushi Shell 내부 라우트로 렌더링한다. Monitor는 수집 상태를 표시하고 나머지 세 화면은 기존 안내용 컴포넌트다.
- Mushi API(앱: `apps/api`): 기존 `devices/:deviceId/heartbeat` 및 `owner/devices/:deviceId/heartbeat` 경로를 내부 Monitor 컨트롤러로 이전했다. Monitor 자체 장치/소유자 인증은 유지하고 전역 Mushi API 토큰 검사 대신 해당 검사를 사용한다.
- Mac Agent(`agent`): 독립 백그라운드 프로세스로 남는다. `MONITOR_API_URL=http://127.0.0.1:3000`으로 Core API에 체크인하도록 설정한다.
- Mushi Shell Module Federation은 별도 저장소 프로젝트를 위한 확장 지점으로만 유지한다. 내장 기능 연결용 `mushi_monitor` Remote와 5174 포트는 더 이상 필요하지 않다. 외부 Remote를 등록할 때는 신뢰된 URL, 인증, 오류 처리, 버전 호환성 검토가 선행되어야 한다.

## 로컬 설정

- 서버 전용 `apps/api/.env`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MONITOR_OWNER_ID`, `MONITOR_DEVICE_ID`, `MONITOR_DEVICE_TOKEN`(선택적 이전 토큰 및 만료일)을 설정한다.
- 웹 `apps/web/.env.local`: `VITE_MONITOR_DEVICE_ID`와 `VITE_MONITOR_API_BASE_URL=http://127.0.0.1:3000`를 설정한다. 기기 토큰은 웹에 절대 넣지 않는다.
- Mac Agent `agent/.env`: `MONITOR_API_URL=http://127.0.0.1:3000`.
- 기존 서버가 실행 중이면 Core API와 Web을 재시작해야 변경된 코드/환경 변수가 반영된다.
- 필요한 DB 테이블은 기존 `monitor.device_heartbeats`를 사용하며 마이그레이션을 새로 실행하거나 데이터를 삭제하지 않는다.

## 검증 및 남은 작업

`pnpm --filter @mushi/api test`, `pnpm --filter @mushi/api build`, `pnpm --filter @mushi/web test`, `pnpm --filter @mushi/web build` 실행 후 실제 인증된 브라우저에서 상태를 검증한다. Mac Agent 단발 체크인은 `node agent/checkin.mjs --once`로 확인한다.

기존 독립 앱 디렉터리는 로컬 백업으로 퇴역시키고 실행 스크립트를 정리한다. Terminal, Agents, Automation API는 현재 예시 health 앱이므로 실제 기능을 구현 완료했다고 간주하지 않는다. 외부 앱 운영 배포도 별도 작업이다.
