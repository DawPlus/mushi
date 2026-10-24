import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import postgres from 'postgres'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'

const connection = process.env.OPPORTUNITIES_DATABASE_URL || process.env.BOOKMARKS_DATABASE_URL
const db = connection ? postgres(connection, { max: 2, prepare: false, connect_timeout: 5 }) : null
const toolSpecs = [
  { name: 'get_opportunities', description: 'List collected opportunities', inputSchema: { type: 'object', properties: { source: { type: 'string', enum: ['support','events','bids'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } } } },
  { name: 'list_analyses', description: 'List saved analyses', inputSchema: { type: 'object', properties: { limit: { type: 'integer' } } } },
]
const bounded = (n: unknown, max: number, fallback: number) => typeof n === 'number' && Number.isInteger(n) ? Math.min(max, Math.max(1, n)) : fallback
const output = (x: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(x) }] })
type RequestBody = { jsonrpc?: string; id?: string | number; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } }

@Public()
@Controller('mcp')
export class PersonalMcpController {
  @Post()
  @HttpCode(200)
  async handle(@Headers('authorization') authorization: string | undefined, @Body() body: RequestBody) {
    const owner = await requireOwnerFromBearer(authorization)
    const id = body?.id ?? null
    const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result })
    const err = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
    if (body?.jsonrpc !== '2.0' || typeof body.method !== 'string') return err(-32600, 'Invalid request')
    if (body.method === 'initialize') return ok({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'mushi-personal-data', version: '0.1.0' } })
    if (body.method === 'ping') return ok({})
    if (body.method === 'tools/list') return ok({ tools: toolSpecs })
    if (body.method === 'notifications/initialized') return null
    if (body.method !== 'tools/call') return err(-32601, 'Unknown method')
    if (!db) return ok({ isError: true, ...output({ error: 'Database connection unavailable' }) })
    const name = body.params?.name
    const args = body.params?.arguments ?? {}
    try {
      if (name === 'get_opportunities') {
        const source = ['support','events','bids'].includes(String(args.source)) ? String(args.source) : ''
        const rows = await db`select source, external_id, title, organization, description, category, period, url, updated_at
          from opportunities.items where (${source} = '' or source = ${source})
          order by updated_at desc limit ${bounded(args.limit,50,20)}`
        return ok(output({ items: rows }))
      }
      if (name === 'list_analyses') {
        const rows = await db`select id,source,title,summary,created_at from opportunities.ai_analyses
          where owner_id=${owner}::uuid order by created_at desc limit ${bounded(args.limit,30,10)}`
        return ok(output({ items: rows }))
      }
      return err(-32602, 'Unknown tool')
    } catch {
      return ok({ isError: true, ...output({ error: 'Operation failed' }) })
    }
  }
}
