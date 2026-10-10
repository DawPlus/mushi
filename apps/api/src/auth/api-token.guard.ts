import { createHash, timingSafeEqual } from 'node:crypto'
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from './public.decorator.js'

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true
    }

    const configured = process.env.API_ACCESS_TOKEN
    const authorization = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>().headers.authorization
    const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null
    if (!configured || !match) throw new UnauthorizedException()

    const providedHash = createHash('sha256').update(match[1]).digest()
    const expectedHash = createHash('sha256').update(configured).digest()
    if (!timingSafeEqual(providedHash, expectedHash)) throw new UnauthorizedException()
    return true
  }
}
