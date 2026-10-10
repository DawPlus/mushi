type AuthConfig = { url?: string; publishableKey?: string; ownerId?: string }

export async function verifyOwnerBearer(
  authorization: string | undefined,
  config: AuthConfig,
  request: typeof fetch = fetch,
): Promise<string | null> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  if (!token || /\s/.test(token)) return null
  if (!token || !config.url || !config.publishableKey || !config.ownerId) return null
  let base: URL
  try {
    base = new URL(config.url)
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) return null
  } catch { return null }
  try {
    const response = await request(new URL('/auth/v1/user', base), {
      headers: { apikey: config.publishableKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const user: unknown = await response.json()
    if (!user || typeof user !== 'object' || !('id' in user)) return null
    return user.id === config.ownerId ? config.ownerId : null
  } catch { return null }
}
