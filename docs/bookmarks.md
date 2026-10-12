# 북마크 기능

- API: `GET/POST /owner/bookmarks`, `GET/PATCH/DELETE /owner/bookmarks/:id`.
- 데이터: `bookmarks.items`; URL, 제목, 설명, 카테고리 문자열, 태그 문자열 배열, 즐겨찾기, 작성·수정시각, 삭제시각.
- 조회: `q`, `category`, `favorite=true|false`, `page`, `limit`. owner_id와 deleted_at으로 모든 조회·변경을 제한한다.
- 권한: Google owner JWT 또는 서버측 선택적 Mushi Service Token; 익명 요청 거부. 인증 검증은 저장소 호출 전에 수행한다.
- URL: http(s)만 허용하며 비밀번호 포함 URL, 과도하게 긴 입력은 거부한다. URL 서버측 자동 가져오기나 스크레이핑은 하지 않는다.
- 런타임: NestJS 서버 비공개 `BOOKMARKS_DATABASE_URL`에 기존 제한된 PostgreSQL 계정 연결. 웹에는 비밀키 없음.
- 운영 정책: 구형 Hosted 로그인 전용 허용 목록은 폐기했다. 북마크 API는 기존 owner 인증과 제한된 DB 계정을 사용한다. 운영 배포 시 인증 및 DB 설정을 확인한다.
- DB 적용 내역: `docs/db/bookmarks-schema.sql`. 다른 시스템 계정은 bookmarks 스키마 접근 불가.
- QA: API 단위 테스트, Chrome을 통한 Vite → NestJS → Supabase 등록/수정/삭제 E2E, 타 소유자 조회·변경 거부 테스트 통과.
- Chrome E2E: 개발 서버 `pnpm dev:web` 구동 후 `cd apps/api && RUN_BOOKMARKS_BROWSER_QA=1 node --env-file=.env --import tsx test/bookmarks-browser-qa.mjs`. 임시 브라우저 프로필과 테스트 데이터는 제거한다. 실제 Google OAuth 세션 로그인 및 Vercel 배포는 별도 출시 검증 대상이다.
