/** Keep localhost OAuth callbacks on the exact development origin and port. */
export function loginRedirectOrigin(origin: string, _hostname: string): string {
  // Keep OAuth on the site where sign-in started, including Vercel Preview.
  // The exact Preview URL must also be allowed in Supabase Auth redirect URLs.
  return `${origin}/`
}

export function oauthCallbackError(search: string): string | null {
  const params = new URLSearchParams(search)
  const code = params.get('error')
  if (!code) return null
  if (code === 'access_denied') return 'Google 로그인이 취소되었거나 접근이 거부됐습니다.'
  return 'Google 로그인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}

export function loginLinkMessage(error: { status?: number } | null): string {
  if (error?.status === 429) return '이메일 요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  if (error) return '로그인 링크를 요청하지 못했습니다. 이메일과 설정을 확인해 주세요.'
  return '메일함에서 로그인 링크를 확인해 주세요.'
}

export function ownerLoginError(error: unknown): string {
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  if (status === 401 || status === 403) return '이 계정은 접근할 수 없습니다. 소유자 계정으로 로그인해 주세요.'
  if (status === 429) return '로그인 확인 요청이 많아요. 잠시 후 새로고침해 주세요.'
  if (status && status >= 500) return '로그인 확인 서버에 문제가 있어요. 잠시 후 새로고침해 주세요.'
  return '로그인 확인 서버에 연결하지 못했어요. 인터넷 연결 또는 API 주소 설정을 확인하고 새로고침해 주세요.'
}
