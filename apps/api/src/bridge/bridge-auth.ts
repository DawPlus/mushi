import { createHash, timingSafeEqual } from 'node:crypto'

/** Minimum Bridge bearer length; short tokens are rejected at the auth boundary. */
export const MIN_BRIDGE_TOKEN_LENGTH = 32

/** Prefer MUSHI_BRIDGE_TOKEN; ONION_BRIDGE_TOKEN is a documented compatibility fallback only. */
export function resolveBridgeToken(): string | undefined {
  const mushi = process.env.MUSHI_BRIDGE_TOKEN
  if (mushi) return mushi
  return process.env.ONION_BRIDGE_TOKEN
}

function matches(provided: string, expected: string): boolean {
  const providedHash = createHash('sha256').update(provided).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(providedHash, expectedHash)
}

/** Bearer auth for Bridge MCP. Never accepts unauthenticated mode. */
export function verifyBridgeBearer(authorization: string | undefined): boolean {
  const expected = resolveBridgeToken()
  if (!expected || expected.length < MIN_BRIDGE_TOKEN_LENGTH) return false
  const token = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization)?.[1] : undefined
  if (!token) return false
  return matches(token, expected)
}
