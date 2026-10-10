export type BridgeState = {
  reachable: boolean
  checkedAt: string
  error?: string
}

export function parseBridgeState(value: unknown): BridgeState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (typeof data.reachable !== 'boolean' ||
    typeof data.checkedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.checkedAt) ||
    !Number.isFinite(Date.parse(data.checkedAt)) ||
    Object.keys(data).some(key => !['reachable', 'checkedAt', 'error'].includes(key))) return null
  if (data.error !== undefined && (
    typeof data.error !== 'string' ||
    !(data.error === 'Bridge 연결 실패' || /^HTTP 5\d\d$/.test(data.error))
  )) return null
  return data as BridgeState
}
