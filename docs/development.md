# 프로젝트 개발 오버라이드

Acorn 공통 규칙과 설치된 Skill에 없는 프로젝트 전용 차이만 기록한다.

기본 기준:

- `acorn/skills/coding-standards/SKILL.md` (최소 변경 정책 포함)
- 작업에 맞는 `acorn/skills/*/SKILL.md`
- 저장소의 기존 구조와 관례

규칙:

- 이 문서의 프로젝트 전용 규칙이 공통 기준보다 우선한다.
- 공통 코딩 규칙을 중복해서 복사하지 않는다.
- 실제 사용하는 스택, 라우터, 패키지, 구조 제약만 기록한다.
- 더 이상 유효하지 않은 오버라이드는 제거한다.

Mushi 전용 규칙:

- pnpm workspace: 프론트 `apps/web`(React + Vite + TanStack Router), 독립 API `apps/api`(NestJS, Node ESM). 각 앱 의존성은 해당 workspace 패키지에 설치하고 루트에는 설치하지 않는다.
- 로컬 실행: `pnpm dev:web`(Vite 기본 5173), `pnpm dev:api`(NestJS 기본 3000, `PORT`로 변경). API 헬스 확인은 `GET /health` → `{ "status": "ok" }`. 웹에서 TanStack Query + Ky로 연결 상태를 확인하며, API 주소는 `VITE_API_BASE_URL`(기본 `http://localhost:3000`)로 설정한다. API CORS는 `WEB_ORIGIN`(기본 `http://localhost:5173`)만 허용하므로 웹 개발 서버 포트가 변경되면 함께 수정한다.
- API 인증: 전역 NestJS Bearer Guard 사용. 서버 전용 `API_ACCESS_TOKEN`으로 보호된 API 호출, 미설정 시 기본 거부(401). `GET /health`만 공개, `GET /auth/check` 인증 확인용. 웹 번들에는 절대 토큰을 넣지 않는다. 사용자 로그인은 Supabase Auth 별도 작업. 자세한 내용은 `docs/database-auth.md`.
- API 검증: `pnpm build:api`, `pnpm typecheck:api`, `pnpm test:api`; 로컬 실제 HTTP·CORS·Ky 연동: `pnpm test:integration`(테스트 서버 실행·종료 포함). Prisma PostgreSQL 스키마는 `apps/api/prisma/`에 두고 `pnpm db:validate`로 계정 없이 검증한다. `DIRECT_URL`은 이후 마이그레이션용, `DATABASE_URL`은 이후 런타임용이며 실제 연결·모델·인증은 `docs/database-auth.md`의 후속 작업이다.
- 웹 페이지/기능 코드는 shadcn 원본 `apps/web/src/components/ui`를 직접 import하지 않는다. 반드시 `apps/web/src/components/common`의 Mushi 공통 래퍼를 사용한다. ESLint import 경계 및 테스트로 검증한다.
- shadcn 원본을 직접 import할 수 있는 곳은 공통 래퍼와 shadcn 원본 내부뿐이다. 새 UI 컴포넌트가 필요하면 원본을 추가한 뒤 Mushi 래퍼를 만들어 사용한다.
- `src/routes`는 TanStack Router 엔트리 및 조합만, 복잡한 화면 기능은 필요 시 `src/features`로 분리한다. `routeTree.gen.ts`는 플러그인 생성 파일로 직접 편집하지 않는다.
- 서버 데이터는 TanStack Query, 앱 내부 공유 상태는 Jotai, HTTP 전송은 Ky로 분리한다. 전역 상태와 쿼리를 중복 보관하지 않고, API 클라이언트는 `apps/web/src/lib/api.ts`를 재사용한다. API 주소는 `VITE_API_BASE_URL`로 설정하며 로컬 기본값은 `http://localhost:3000`이다.
- 프론트 검증: `pnpm build:web`, `pnpm lint:web`, `pnpm test:web`. 외부 Vercel/Supabase 연동은 별도 티켓에서 진행한다.
