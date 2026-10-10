/** Hosted release defaults to login-only. Monitor reads require explicit opt-in. */
export function isBlockedHostedRoute(
  method: string,
  rawPath: string,
  hosted: boolean,
  monitorReadsEnabled = false,
): boolean {
  if (!hosted) return false
  const pathname = rawPath.split('?')[0]
  if (method === 'GET' && (pathname === '/health' || pathname === '/auth/owner')) return false
  if (method === 'GET' && monitorReadsEnabled &&
    /^\/owner\/devices\/[^/]+\/(?:heartbeat|metrics-history)$/.test(pathname)) return false
  return true
}
