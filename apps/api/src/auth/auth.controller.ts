import { Controller, Get } from '@nestjs/common'

@Controller('auth')
export class AuthController {
  @Get('check')
  check() {
    return { authenticated: true }
  }
}
