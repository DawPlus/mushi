export function loginRedirectOrigin(origin: string, hostname: string): string {
  return hostname.endsWith('.vercel.app') ? 'https://mushi-wine.vercel.app' : origin
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
