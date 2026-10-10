export type HeartbeatStatus = 'online' | 'offline' | 'unknown'

export function heartbeatView<T extends { lastSeenAt: Date | string }>(value: T | null, now = Date.now()) {
  const lastSeenAt = value?.lastSeenAt ?? null
  return { ...value, lastSeenAt, status: heartbeatStatus(lastSeenAt, now) }
}

export function heartbeatStatus(lastSeenAt: Date | string | null | undefined, now = Date.now()): HeartbeatStatus {
  if (!lastSeenAt) return 'unknown'
  const value = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(value) || value > now) return 'unknown'
  return now - value > 120_000 ? 'offline' : 'online'
}
