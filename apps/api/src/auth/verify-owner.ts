type OwnerIdentity = { id: string }

/** Validate an access token with the configured Supabase Auth service, not by decoding unverified JWT claims. */
export async function verifyOwnerAccessToken(
  token: string,
  config: { url?: string; publishableKey?: string; ownerUserId?: string },
  request: typeof fetch = fetch,
): Promise<OwnerIdentity | null> {
  const { url, publishableKey, ownerUserId } = config
  if (!url || !publishableKey || !ownerUserId || !token || /\s/.test(token)) return null

  let authUrl: URL
  try {
    const base = new URL(url)
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') return null
    authUrl = new URL('/auth/v1/user', base)
  } catch {
    return null
  }

  try {
    const response = await request(authUrl, {
      method: 'GET',
      headers: { apikey: publishableKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    })
    if (!response.ok) return null
    const identity: unknown = await response.json()
    if (!identity || typeof identity !== 'object' || !('id' in identity)) return null
    return identity.id === ownerUserId ? { id: ownerUserId } : null
  } catch {
    return null
  }
}
