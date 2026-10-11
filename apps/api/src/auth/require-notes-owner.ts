import { createHash, timingSafeEqual } from 'node:crypto'
import { UnauthorizedException } from '@nestjs/common'
import { requireOwnerFromBearer } from './require-owner.js'

/**
 * Notes-only machine credential. Local server keeps this secret server-side.
 * Browser owner JWTs continue through the existing owner verifier.
 */
export async function requireNotesOwnerFromBearer(authorization?: string): Promise<string> {
  const token = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization)?.[1] : undefined
  if (!token) throw new UnauthorizedException()
  const secret = process.env.MUSHI_LOCAL_SERVICE_TOKEN
  const owner = process.env.SUPABASE_OWNER_USER_ID
  if (secret && secret.length >= 32 && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(owner ?? '')) {
    const actual = createHash('sha256').update(token).digest()
    const expected = createHash('sha256').update(secret).digest()
    if (timingSafeEqual(actual, expected)) return owner!
  }
  return requireOwnerFromBearer(authorization)
}
