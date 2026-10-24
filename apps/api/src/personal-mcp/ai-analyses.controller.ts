import { BadRequestException, Body, Controller, Get, Headers, Post, Query, ServiceUnavailableException } from '@nestjs/common'
import postgres from 'postgres'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'

const databaseUrl = process.env.OPPORTUNITIES_DATABASE_URL || process.env.BOOKMARKS_DATABASE_URL
const sql = databaseUrl ? postgres(databaseUrl, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false }) : null
type AnalysisInput = { title?: unknown; summary?: unknown; source?: unknown }

export function validateAnalysis(value: unknown): { title: string; summary: string; source: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Invalid JSON body')
  const fields = value as AnalysisInput
  const title = typeof fields.title === 'string' ? fields.title.trim() : ''
  const summary = typeof fields.summary === 'string' ? fields.summary.trim() : ''
  const source = fields.source === undefined ? 'general' : fields.source
  if (!title || title.length > 160 || !summary || summary.length > 12000 ||
      !['general', 'support', 'events', 'bids'].includes(String(source))) {
    throw new BadRequestException('Invalid analysis fields')
  }
  return { title, summary, source: String(source) }
}

@Public()
@Controller('owner/ai-analyses')
export class AiAnalysesController {
  @Get()
  async list(@Headers('authorization') authorization?: string, @Query('limit') rawLimit?: string) {
    const owner = await requireOwnerFromBearer(authorization)
    if (!sql) throw new ServiceUnavailableException('Analysis database unavailable')
    const parsed = Number(rawLimit ?? 10)
    const limit = Number.isInteger(parsed) ? Math.min(30, Math.max(1, parsed)) : 10
    const rows = await sql`select id, source, title, summary, created_at from opportunities.ai_analyses
      where owner_id = ${owner}::uuid order by created_at desc limit ${limit}`
    return { items: rows }
  }

  @Post()
  async save(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    const owner = await requireOwnerFromBearer(authorization)
    const { title, summary, source } = validateAnalysis(body)
    if (!sql) throw new ServiceUnavailableException('Analysis database unavailable')
    const rows = await sql`insert into opportunities.ai_analyses (owner_id, source, title, summary)
      values (${owner}::uuid, ${source}, ${title}, ${summary}) returning id, source, title, created_at`
    return { saved: true, analysis: rows[0] }
  }
}
