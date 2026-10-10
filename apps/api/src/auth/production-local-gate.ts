/** Mac-local control endpoints must never execute inside hosted Core API. */
export function isHostedLocalControl(path: string, production: boolean): boolean {
  if (!production) return false
  const pathname = path.split('?')[0]
  return pathname === '/bridge/mcp' ||
    pathname === '/owner/bridge' || pathname.startsWith('/owner/bridge/') ||
    pathname === '/owner/codync' || pathname.startsWith('/owner/codync/') ||
    pathname === '/owner/mac-agent' || pathname.startsWith('/owner/mac-agent/')
}
