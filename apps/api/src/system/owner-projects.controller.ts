import { Body, Controller, Get, Headers, Param, Post, BadRequestException, NotFoundException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'
import { ExternalProjectRegistry } from './external-project-registry.js'

const registry = new ExternalProjectRegistry()

/** Review-only metadata registry. Never loads or executes a remote entry. */
@Public()
@Controller('owner/projects')
export class OwnerProjectsController {
  @Get()
  async list(@Headers('authorization') authorization?: string) {
    return registry.list(await requireOwnerFromBearer(authorization))
  }

  @Post()
  async register(@Body() input: unknown, @Headers('authorization') authorization?: string) {
    const ownerId = await requireOwnerFromBearer(authorization)
    const origins = (process.env.EXTERNAL_REMOTE_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean)
    try { return registry.register(ownerId, input, origins) }
    catch { throw new BadRequestException('Invalid or untrusted project') }
  }

  @Post(':id/remove')
  async remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const ownerId = await requireOwnerFromBearer(authorization)
    if (!registry.remove(ownerId, id)) throw new NotFoundException()
    return { removed: true }
  }
}
