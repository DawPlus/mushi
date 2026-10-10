const BRIDGE_URL = 'http://127.0.0.1:3847/'
export const HEARTBEAT_TIMEOUT_MS = 120_000

export type OnionProbe = { reachable: boolean; checkedAt: string; error?: string }

/** Run on the Mac only. Never fetch a browser-provided URL. */
export async function probeOnionBridge(request: typeof fetch = fetch, now = new Date()): Promise<OnionProbe> {
  try {
    const response = await request(BRIDGE_URL, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(2000) })
    return { reachable: response.status > 0 && response.status < 500, checkedAt: now.toISOString(), ...(
      response.status >= 500 ? { error: `HTTP ${response.status}` } : {}
    ) }
  } catch {
    return { reachable: false, checkedAt: now.toISOString(), error: 'Bridge 연결 실패' }
  }
}

/** The last successful heartbeat is retained even after going offline. */
export function heartbeatState(lastSeenAt: string | null, nowMs = Date.now()) {
  const last = lastSeenAt === null ? NaN : Date.parse(lastSeenAt)
  const valid = Number.isFinite(last) && last <= nowMs
  return { online: valid && nowMs - last <= HEARTBEAT_TIMEOUT_MS, lastSeenAt }
}
