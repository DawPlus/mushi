import { BadRequestException, Body, Controller, Get, Headers, Param, Post, ServiceUnavailableException } from '@nestjs/common'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'

async function hostCall(method: 'sync' | 'history' | 'send' | 'stop' | 'respondPermission', body: object): Promise<unknown> {
  try {
    const token = process.env.CODYNC_HOST_TOKEN?.trim() ||
      (await readFile(join(homedir(), '.codync', 'token'), 'utf8')).trim()
    if (!token) throw new Error('Missing credential')
    const response = await fetch(`http://127.0.0.1:19222/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Host error')
    return response.json() as Promise<unknown>
  } catch {
    throw new ServiceUnavailableException('Codync host request failed')
  }
}

function validId(value: string) {
  if (!/^[\w-]{1,128}$/.test(value)) throw new BadRequestException('Invalid identifier')
  return value
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

@Public()
@Controller('owner/codync')
export class OwnerCodyncController {
  @Get('bots')
  async bots(@Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const data = record(await hostCall('sync', { since: 0 }))
    if (!Array.isArray(data.bots)) throw new ServiceUnavailableException('Invalid Codync response')
    return { bots: data.bots.map(record).filter(bot => typeof bot.id === 'string' && !bot.deleted).map(bot => ({
      id: bot.id, name: typeof bot.name === 'string' ? bot.name : 'Agent',
      backend: typeof bot.backend === 'string' ? bot.backend : '',
      model: typeof bot.model === 'string' ? bot.model : '',
      kind: typeof bot.kind === 'string' ? bot.kind : 'agent',
      status: typeof bot.status === 'string' ? bot.status : 'unknown',
      activity: typeof bot.activity === 'string' ? bot.activity : '',
    })) }
  }

  @Get('bots/:botId/history')
  async history(@Param('botId') botId: string, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const data = record(await hostCall('history', { botId: validId(botId), limit: 100 }))
    if (!Array.isArray(data.entries)) throw new ServiceUnavailableException('Invalid Codync history')
    return { entries: data.entries.map(record).map(entry => {
      const payload = record(entry.data)
      return {
        id: entry.id, kind: entry.kind, turn: entry.turn,
        text: typeof payload.text === 'string' ? payload.text.slice(0, 12000) : '',
        status: typeof payload.status === 'string' ? payload.status : '',
        options: Array.isArray(payload.options) ? payload.options : [],
      }
    }) }
  }

  @Post('bots/:botId/send')
  async send(@Param('botId') botId: string, @Body() body: unknown, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const text = record(body).text
    if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw new BadRequestException('Invalid message')
    return hostCall('send', { botId: validId(botId), text: text.trim() })
  }

  @Post('bots/:botId/stop')
  async stop(@Param('botId') botId: string, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    return hostCall('stop', { botId: validId(botId) })
  }

  @Post('permissions/:entryId/respond')
  async respond(@Param('entryId') entryId: string, @Body() body: unknown, @Headers('authorization') authorization?: string) {
    await requireOwnerFromBearer(authorization)
    const optionId = record(body).optionId
    if (typeof optionId !== 'string' || !optionId || optionId.length > 128) throw new BadRequestException('Invalid option')
    return hostCall('respondPermission', { entryId: validId(entryId), optionId })
  }
}
