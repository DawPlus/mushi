# Mushi Google 로그인 설정 (T-261010-22)

코드는 반영됐지만 실제 Google 계정 로그인은 사용자 계정에서 제공자 설정이 완료된 후 검증할 수 있다.

## 집에서 필요한 설정

1. Google Cloud Console에서 OAuth 동의 화면 및 **웹 애플리케이션** OAuth 클라이언트를 생성한다.
2. 승인된 JavaScript origin은 필요에 따라 `http://localhost:5173`과 실제 Mushi 배포 도메인을 등록한다. Redirect URI에는 임의의 Mushi 화면이 아닌 **Supabase Dashboard → Authentication → Providers → Google**에 표시된 **Callback URL**을 정확히 등록한다 (보통 `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Supabase Dashboard → Authentication → Providers → Google을 활성화하고 Google Client ID / Client Secret을 Supabase에만 저장한다. **브라우저 .env 또는 Git에 Client Secret을 저장하지 않는다.**
4. Supabase Dashboard → Authentication → URL Configuration에서 사이트 URL을 실제 Mushi 주소로 설정하고 `http://localhost:5173/**`, `https://mushi-wine.vercel.app/**` 등 실제 사용 URL만 Redirect URL 허용 목록에 추가한다.
5. 기존 Owner와 Google 로그인 사용자가 **동일한 Supabase user UUID인지 확인**한다. Google 계정 이메일이 같아도 UUID가 다르면 현재 `/auth/owner` 정책상 접근 거절되는 것이 정상이다. 새 사용자를 무조건 Owner로 추가하지 말고 기존 계정의 identity 연결 방식부터 확인한다.
6. Mac과 배포 환경에서 Google 로그인 → Owner API 검증 → 새로고침 / 메뉴 이동 / 로그아웃 / 비소유자 접근 거부를 실사용 테스트한다.

## 세션

Supabase JS 기본 세션 보관 및 토큰 자동 갱신을 사용한다. 30일 로그인을 보장하도록 장기 토큰을 별도 저장하거나 자체 인증을 구현하지 않는다. 실제 재인증 정책은 Supabase Auth 설정에 따른다.

## 남은 작업

- Google/Supabase 외부 제공자 구성은 사용자가 집에서 진행
- 계정 identity/Owner UUID가 일치하는지 실제 로그인으로 확인
- 브라우저 E2E와 보안 검토 통과 후 티켓 완료 처리
