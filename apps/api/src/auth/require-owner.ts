import { UnauthorizedException } from '@nestjs/common'
import { verifyOwnerAccessToken } from './verify-owner.js'

/** Independent owner JWT verification for public-decorated owner-only endpoints. */
export async function requireOwnerFromBearer(authorization?: string): Promise<string> {
  const token = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization)?.[1] : undefined
  if (!token) throw new UnauthorizedException()
  const identity = await verifyOwnerAccessToken(token, {
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    ownerUserId: process.env.SUPABASE_OWNER_USER_ID,
  })
  if (!identity) throw new UnauthorizedException()
  return identity.id
}
