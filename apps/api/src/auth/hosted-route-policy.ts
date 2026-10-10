/** First hosted release only needs health and Supabase owner verification. */
export function isBlockedHostedRoute(
  method: string,
  rawPath: string,
  hosted: boolean,
): boolean {
  if (!hosted) return false
  const pathname = rawPath.split('?')[0]
  return !(method === 'GET' && (pathname === '/health' || pathname === '/auth/owner'))
}
