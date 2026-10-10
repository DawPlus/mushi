import type { MacSnapshot } from './mac-status'

export type BridgeState = { reachable: boolean; checkedAt: string; error?: string }

export type MonitorState = {
  status: 'online' | 'offline' | 'unknown'
  lastSeenAt: string | null
  macMetrics?: MacSnapshot | null
  bridge?: BridgeState | null
}

const deviceUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const metricNumbers = [
  'cpuPercent', 'cpuCores', 'memoryUsedBytes', 'memoryTotalBytes',
  'diskUsedBytes', 'diskTotalBytes', 'uptimeSeconds', 'processCount',
] as const

function isSnapshot(data: unknown): data is MacSnapshot {
  if (!data || typeof data !== 'object') return false
  const value = data as Record<string, unknown>
  for (const key of ['memoryAvailableBytes', 'swapUsedBytes', 'swapTotalBytes']) {
    if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || (value[key] as number) < 0)) return false
  }
  return typeof value.recordedAt === 'string' &&
    Number.isFinite(Date.parse(value.recordedAt)) &&
    metricNumbers.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
}

function isBridgeState(data: unknown): data is BridgeState {
  if (!data || typeof data !== 'object') return false
  const value = data as Record<string, unknown>
  return typeof value.reachable === 'boolean' && typeof value.checkedAt === 'string' &&
    Number.isFinite(Date.parse(value.checkedAt)) &&
    Object.keys(value).every(key => ['reachable', 'checkedAt', 'error'].includes(key)) &&
    (value.error === undefined || (typeof value.error === 'string' &&
      (value.error === 'Bridge 연결 실패' || /^HTTP 5\d\d$/.test(value.error))))
}

function parseMonitorState(value: unknown): MonitorState {
  if (!value || typeof value !== 'object') throw new Error('Invalid Monitor response')
  const data = value as Record<string, unknown>
  if (typeof data.status !== 'string' || !['online', 'offline', 'unknown'].includes(data.status) ||
    !(data.lastSeenAt === null || (typeof data.lastSeenAt === 'string' && Number.isFinite(Date.parse(data.lastSeenAt)))) ||
    (data.macMetrics !== undefined && data.macMetrics !== null && !isSnapshot(data.macMetrics)) ||
    (data.bridge !== undefined && data.bridge !== null && !isBridgeState(data.bridge))) {
    throw new Error('Invalid Monitor response')
  }
  return {
    status: data.status as MonitorState['status'],
    lastSeenAt: data.lastSeenAt as string | null,
    macMetrics: (data.macMetrics ?? null) as MonitorState['macMetrics'],
    bridge: (data.bridge ?? null) as MonitorState['bridge'],
  }
}

export async function fetchMonitorStatus(
  token: string,
  deviceId: string,
  baseUrl: string,
  request: typeof fetch = fetch,
): Promise<MonitorState> {
  if (!token || /\s/.test(token) || !deviceUuid.test(deviceId)) throw new Error('Monitor configuration unavailable')
  const base = new URL(baseUrl)
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
    (base.protocol !== 'https:' && !(base.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) {
    throw new Error('Invalid Monitor endpoint')
  }
  const response = await request(new URL('owner/devices/' + deviceId + '/heartbeat', base), {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!response.ok) throw new Error('Monitor status unavailable')
  return parseMonitorState(await response.json())
}


export type MonitorHistory = { at: string; cpuPercent: number; memoryUsedBytes: number; memoryTotalBytes: number }

export function parseMonitorHistory(payload: unknown): MonitorHistory[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { samples?: unknown }).samples)) throw new Error('Invalid history')
  const samples = (payload as { samples: unknown[] }).samples
  if (samples.length > 500 || !samples.every(value => {
    if (!value || typeof value !== 'object') return false
    const item = value as Record<string, unknown>
    return typeof item.at === 'string' && Number.isFinite(Date.parse(item.at)) &&
      typeof item.cpuPercent === 'number' && Number.isFinite(item.cpuPercent) &&
      item.cpuPercent >= 0 && item.cpuPercent <= 100 &&
      typeof item.memoryUsedBytes === 'number' && Number.isSafeInteger(item.memoryUsedBytes) && item.memoryUsedBytes >= 0 &&
      typeof item.memoryTotalBytes === 'number' && Number.isSafeInteger(item.memoryTotalBytes) && item.memoryTotalBytes > 0 &&
      item.memoryUsedBytes <= item.memoryTotalBytes
  })) throw new Error('Invalid history samples')
  const parsed = samples as MonitorHistory[]
  if (parsed.some((sample, index) => index > 0 && Date.parse(sample.at) < Date.parse(parsed[index - 1].at))) throw new Error('Unordered history samples')
  return parsed
}

export async function loadMonitorHistory(): Promise<MonitorHistory[]> {
  const { getOwnerAccessToken } = await import('./owner-login')
  const token = await getOwnerAccessToken()
  const deviceId = import.meta.env.VITE_MONITOR_DEVICE_ID ?? ''
  const baseUrl = import.meta.env.VITE_MONITOR_API_BASE_URL || 'http://127.0.0.1:3000'
  if (!token || !deviceUuid.test(deviceId)) throw new Error('Monitor history authentication unavailable')
  const base = new URL(baseUrl)
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
    (base.protocol !== 'https:' && !(base.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) {
    throw new Error('Invalid Monitor endpoint')
  }
  const response = await fetch(new URL('owner/devices/' + deviceId + '/metrics-history?hours=24', base), {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!response.ok) throw new Error('Monitor history unavailable')
  return parseMonitorHistory(await response.json())
}

export async function loadMonitorStatus(): Promise<MonitorState> {
  const { getOwnerAccessToken } = await import('./owner-login')
  const token = await getOwnerAccessToken()
  if (!token) throw new Error('Owner session unavailable')
  return fetchMonitorStatus(
    token,
    import.meta.env.VITE_MONITOR_DEVICE_ID ?? '',
    import.meta.env.VITE_MONITOR_API_BASE_URL || 'http://127.0.0.1:3000',
  )
}
