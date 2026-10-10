import { Controller, Post, Req, Res } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Public } from '../auth/public.decorator.js'
import { bridgeService, type BridgeHttpRequest, type BridgeHttpResponse } from './bridge.service.js'

@Controller('bridge')
export class BridgeController {
  /** Bridge MCP uses MUSHI_BRIDGE_TOKEN (not API_ACCESS_TOKEN). */
  @Public()
  @Post('mcp')
  async mcp(
    @Req() req: IncomingMessage & { body?: unknown; headers: IncomingMessage['headers'] & { authorization?: string } },
    @Res() res: ServerResponse,
  ): Promise<void> {
    await bridgeService.handleMcp(req as BridgeHttpRequest, res as BridgeHttpResponse)
  }
}
