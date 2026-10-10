import { Body, Controller, Get, Headers, Param, Post, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'
import { OwnerJobService } from './owner-job.service.js'

type NewJob = { command?: unknown; requestId?: unknown }
const jobs = new OwnerJobService()

/** Owner-only job planning; deliberately provides no execution or agent dispatch endpoint. */
@Public()
@Controller('owner/cli-jobs')
export class OwnerJobsController {
  @Get()
  async list(@Headers('authorization') authorization?: string) {
    return jobs.list(await requireOwnerFromBearer(authorization))
  }

  @Get(':id')
  async get(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const result = jobs.get(await requireOwnerFromBearer(authorization), id)
    if (!result) throw new NotFoundException()
    return result
  }

  @Post()
  async create(@Body() body: NewJob | undefined, @Headers('authorization') authorization?: string) {
    const ownerId = await requireOwnerFromBearer(authorization)
    if (typeof body?.command !== 'string' || typeof body?.requestId !== 'string') throw new BadRequestException('Invalid job request')
    try { return jobs.create(ownerId, body.command, body.requestId) }
    catch (error) {
      if (error instanceof Error && /conflict/.test(error.message)) throw new ConflictException('Duplicate request conflict')
      throw new BadRequestException('Invalid job request')
    }
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const result = jobs.cancel(await requireOwnerFromBearer(authorization), id)
    if (!result) throw new NotFoundException()
    return result
  }
}
