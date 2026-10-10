import { createHash, timingSafeEqual } from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type DeviceConfig = {
  deviceId?: string
  ownerId?: string
  token?: string
  previousToken?: string
  previousTokenValidUntil?: string
  revoked?: string
}

const matches = (provided: string, secret?: string) => {
  if (!secret || secret.length < 32) return false
  return timingSafeEqual(
    createHash('sha256').update(provided).digest(),
    createHash('sha256').update(secret).digest(),
  )
}

export function verifyDeviceBearer(
  authorization: string | undefined,
  requestedDeviceId: string,
  config: DeviceConfig,
  now = Date.now(),
): { deviceId: string; ownerId: string } | null {
  if (config.revoked === 'true') return null
  if (!UUID.test(requestedDeviceId) || !UUID.test(config.deviceId ?? '') || !UUID.test(config.ownerId ?? '')) return null
  if (requestedDeviceId !== config.deviceId || !config.ownerId || !config.token || config.token.length < 32) return null
  const token = /^Bearer ([^\s]+)$/.exec(authorization ?? '')?.[1]
  if (!token) return null

  const expiry = config.previousTokenValidUntil ? Date.parse(config.previousTokenValidUntil) : NaN
  const legacyAllowed = Number.isFinite(expiry) && now < expiry
  if (!matches(token, config.token) && !(legacyAllowed && matches(token, config.previousToken))) return null
  return { deviceId: config.deviceId, ownerId: config.ownerId }
}
