/** Hosted release defaults to login-only. Monitor reads require explicit opt-in. */
export function isBlockedHostedRoute(
  method: string,
  rawPath: string,
  hosted: boolean,
  monitorReadsEnabled = false,
  notesEnabled = false,
  bookmarksEnabled = false,
): boolean {
  if (!hosted) return false
  const pathname = rawPath.split('?')[0]
  if (method === 'GET' && (pathname === '/health' || pathname === '/auth/owner' || pathname === '/public/github-trending')) return false
  if (notesEnabled && ((pathname === '/owner/notes' && ['GET', 'POST'].includes(method)) ||
      (/^\/owner\/notes\/[0-9a-f-]{36}$/i.test(pathname) && ['GET', 'PATCH', 'DELETE'].includes(method)) ||
      (pathname === '/owner/note-categories' && ['GET', 'POST'].includes(method)) ||
      (/^\/owner\/note-categories\/[0-9a-f-]{36}$/i.test(pathname) && ['PATCH', 'DELETE'].includes(method)))) return false
  if (bookmarksEnabled && ((pathname === '/owner/bookmarks' && ['GET', 'POST'].includes(method)) ||
    (/^\/owner\/bookmarks\/[0-9a-f-]{36}$/i.test(pathname) && ['GET', 'PATCH', 'DELETE'].includes(method)))) return false
  if (method === 'GET' && monitorReadsEnabled &&
    /^\/owner\/devices\/[^/]+\/(?:heartbeat|metrics-history)$/.test(pathname)) return false
  return true
}
