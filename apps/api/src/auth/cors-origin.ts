/** Explicit one-origin CORS policy. Missing production configuration must fail closed. */
export function resolveWebOrigin(raw: string | undefined, production: boolean): string {
  if (!raw) {
    if (production) throw new Error('WEB_ORIGIN is required in production')
    return 'http://localhost:5173'
  }
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('Invalid WEB_ORIGIN') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback && !production)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.origin !== raw) {
    throw new Error('Invalid WEB_ORIGIN')
  }
  return url.origin
}
