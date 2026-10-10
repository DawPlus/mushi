import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'
import {
  BridgeManagerService,
  bridgeManagerService,
} from './bridge-manager.service.js'

@Public()
@Controller('owner/bridge')
export class OwnerBridgeController {
  constructor(
    private readonly manager: BridgeManagerService = bridgeManagerService,
  ) {}

  @Get()
  async getStatus(@Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    return this.manager.getStatus()
  }

  @Get('folders')
  async folders(
    @Headers('authorization') authorization?: string,
    @Query('directory') directory?: string,
  ) {
    await requireOwnerFromBearer(authorization)
    return this.manager.browse(directory ?? '')
  }

  @Get('projects')
  async projects(
    @Headers('authorization') authorization?: string,
    @Query('workspace') workspace?: string,
  ) {
    await requireOwnerFromBearer(authorization)
    if (typeof workspace !== 'string') throw new BadRequestException('Workspace required')
    return this.manager.projects(workspace)
  }

  @Post('project-flag')
  async projectFlag(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const input = body as { id?: unknown; flag?: unknown; value?: unknown } | null
    if (!input || typeof input.id !== 'string' ||
      (input.flag !== 'favorite' && input.flag !== 'hidden') ||
      typeof input.value !== 'boolean') throw new BadRequestException('Invalid project flag')
    return this.manager.setProjectFlag(input.id, input.flag, input.value)
  }

  @Get('configuration')
  async configuration(@Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    return this.manager.configuration()
  }

  @Post('tunnel-action')
  async tunnelAction(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const value = body as { id?: unknown; action?: unknown } | null
    if (!value || typeof value.id !== 'string' ||
      (value.action !== 'start' && value.action !== 'stop')) throw new BadRequestException('Invalid tunnel action')
    return this.manager.tunnelAction(value.id, value.action)
  }

  @Post('dev-action')
  async devAction(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const value = body as { id?: unknown; action?: unknown } | null
    if (!value || typeof value.id !== 'string' ||
        (value.action !== 'start' && value.action !== 'stop')) throw new BadRequestException('Invalid dev action')
    return this.manager.devAction(value.id, value.action)
  }

  @Post('pick-workspace')
  async pickWorkspace(@Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    return this.manager.pickWorkspace()
  }

  @Post('start-directory')
  async startDirectory(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    await requireOwnerFromBearer(authorization)
    if (!body || typeof body !== 'object' || typeof (body as { directory?: unknown }).directory !== 'string') {
      throw new BadRequestException('Invalid directory parameter')
    }
    return this.manager.startDirectory((body as { directory: string }).directory)
  }

  @Post('start')
  async start(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    await requireOwnerFromBearer(authorization)

    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as { workspace?: unknown }).workspace !== 'string' ||
      !(body as { workspace: string }).workspace.trim()
    ) {
      throw new BadRequestException('Invalid workspace parameter')
    }

    return await this.manager.start(
      (body as { workspace: string }).workspace.trim(),
    )
  }

  @Post('stop')
  async stop(@Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    return await this.manager.stop()
  }
}
