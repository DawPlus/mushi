/** Shared owner API error copy; keep generic across Bridge and CLI conflicts. */
export function ownerHttpErrorMessage(status: number): string {
  if (status === 401) return '인증이 만료됐습니다. 다시 로그인해 주세요.'
  if (status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  if (status === 409) return '요청이 충돌했습니다. 현재 상태를 확인한 뒤 다시 시도해 주세요.'
  return '요청을 처리하지 못했습니다. (' + status + ')'
}
