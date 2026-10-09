import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common'
import { Public } from './public.decorator.js'
import { verifyOwnerAccessToken } from './verify-owner.js'

@Controller('auth')
export class OwnerController {
  @Public()
  @Get('owner')
  async owner(@Headers('authorization') authorization?: string) {
    const token = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization)?.[1] : undefined
    if (!token) throw new UnauthorizedException()

    const owner = await verifyOwnerAccessToken(token, {
      url: process.env.SUPABASE_URL,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      ownerUserId: process.env.SUPABASE_OWNER_USER_ID,
    })
    if (!owner) throw new UnauthorizedException()
    return { authenticated: true, userId: owner.id }
  }
}
