import { Controller, Get, Post, Param, Headers, Req, ForbiddenException, BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'
import { agentLaunchStatus, isLocalAgentRequest, setAgentLaunchRunning } from './agent-launch.js'

type LocalRequest = { socket: { remoteAddress?: string; localAddress?: string } }
@Public()
@Controller('owner/mac-agent')
export class MacAgentControlController {
  private async authorize(authorization: string | undefined, request: LocalRequest) {
    await requireOwnerFromBearer(authorization)
    if (!isLocalAgentRequest(request.socket.remoteAddress, request.socket.localAddress)) throw new ForbiddenException('Local Mac only')
  }
  @Get('status')
  async status(@Headers('authorization') authorization: string | undefined, @Req() request: LocalRequest) {
    await this.authorize(authorization, request)
    return agentLaunchStatus()
  }
  @Post(':action')
  async change(@Param('action') action: string, @Headers('authorization') authorization: string | undefined, @Req() request: LocalRequest) {
    await this.authorize(authorization, request)
    if (action !== 'start' && action !== 'stop') throw new BadRequestException('Invalid action')
    try { return await setAgentLaunchRunning(action === 'start') }
    catch { throw new ServiceUnavailableException('Mac Agent operation failed') }
  }
}
