import { Controller, Get, Headers, Query, Post, ServiceUnavailableException } from '@nestjs/common'
import postgres from 'postgres'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'

type Opportunity = { id: string; title: string; organization: string; description: string; category: string; period: string; url: string; tags: string[] }
const endpoint = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'
const safeText = (value: unknown): string => typeof value === 'string' ? value.replace(/<[^>]+>/g, '').trim() : ''
const safeUrl = (value: unknown): string => { try { const url = new URL(String(value)); return url.protocol === 'https:' ? url.toString() : '' } catch { return '' } }

function normalize(payload: unknown): Opportunity[] {
  const root = payload as Record<string, any>
  const candidates = root?.jsonArray ?? root?.items ?? root?.item ?? root?.data ?? root?.response?.body?.items?.item
  const records = Array.isArray(candidates) ? candidates : Array.isArray(candidates?.item) ? candidates.item : []
  return records.flatMap((record: Record<string, unknown>, index: number) => {
    const title = safeText(record.pblancNm ?? record.title ?? record.pblancTitle)
    const url = safeUrl(record.pblancUrl ?? record.link ?? record.url)
    if (!title || !url) return []
    const category = safeText(record.lclasNm ?? record.category ?? record.realmLclasNm) || '지원사업'
    return [{ id: safeText(record.pblancId ?? record.id) || `bizinfo-${index}`, title, url, category,
      organization: safeText(record.jrsdInsttNm ?? record.excInsttNm ?? record.organization) || '기업마당',
      description: safeText(record.bsnsSumryCn ?? record.description),
      period: safeText(record.reqstBeginEndDe ?? record.reqstPd ?? record.period),
      tags: safeText(record.hashtags ?? record.tags).split(/[,#]/).map(tag => tag.trim()).filter(Boolean).slice(0, 6) }]
  })
}

async function collect(): Promise<Opportunity[]> {
  const key = process.env.BIZINFO_API_KEY?.trim()
  if (!key) throw new ServiceUnavailableException('BIZINFO_API_KEY is not configured')
  const url = new URL(endpoint)
  url.searchParams.set('crtfcKey', key)
  url.searchParams.set('dataType', 'json')
  url.searchParams.set('searchCnt', '100')
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new ServiceUnavailableException('Bizinfo upstream is unavailable')
  const payload: unknown = await response.json()
  return normalize(payload)
}

type Source = 'support' | 'events' | 'bids'
const eventEndpoint = 'https://www.bizinfo.go.kr/uss/rss/bizinfoEventApi.do'
const bidEndpoint = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServcPPSSrch'
const fetchJson = async (url: URL): Promise<unknown> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Upstream HTTP ' + response.status)
  return response.json()
}
const collectEvents = async (): Promise<Opportunity[]> => {
  const key = process.env.BIZINFO_EVENT_API_KEY?.trim()
  if (!key) throw new Error('Event API not configured')
  const url = new URL(eventEndpoint)
  url.searchParams.set('crtfcKey', key)
  url.searchParams.set('dataType', 'json')
  url.searchParams.set('searchCnt', '100')
  const payload = await fetchJson(url)
  const root = payload as { jsonArray?: Record<string, unknown>[] }
  if (!Array.isArray(root?.jsonArray)) throw new Error('Unexpected event response')
  return root.jsonArray.map((item, index) => ({
    id: safeText(item.eventInfoId) || 'event-' + index,
    title: safeText(item.nttNm),
    organization: safeText(item.originEngnNm) || '기업마당',
    description: safeText(item.nttCn),
    category: safeText(item.eventInfoTyNm) || '행사·교육',
    period: safeText(item.eventBeginEndDe ?? item.rceptPd),
    url: safeUrl(new URL(String(item.bizinfoUrl || item.orginlUrlAdres || ''), 'https://www.bizinfo.go.kr').toString()),
    tags: safeText(item.hashtags).split(/[,#]/).map(tag => tag.trim()).filter(Boolean).slice(0, 6),
  })).filter(item => item.title && item.url)
}
const developmentTerms = /소프트웨어|SW(?:\s|\b)|정보시스템|정보화|시스템\s*(구축|개발|고도화)|웹사이트|홈페이지|플랫폼|클라우드|인공지능|AI(?:\s|\b)|빅데이터|데이터\s*(구축|개발)|앱\s*개발|전산\s*(개발|구축)/i
const collectBids = async (): Promise<Opportunity[]> => {
  const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim()
  if (!key) throw new Error('Public data API not configured')
  const url = new URL(bidEndpoint)
  const end = new Date()
  const start = new Date(end.getTime() - 48 * 60 * 60_000)
  const stamp = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(date).replace(/\D/g, '')
  for (const [name, value] of Object.entries({ serviceKey:key, type:'json', pageNo:'1', numOfRows:'100', inqryDiv:'1', inqryBgnDt:stamp(start), inqryEndDt:stamp(end) })) url.searchParams.set(name,value)
  const payload = await fetchJson(url) as Record<string, any>
  const body = payload?.response?.body
  if (String(payload?.response?.header?.resultCode ?? '') !== '00') throw new Error('Bid API returned error')
  const rows = body?.items?.item ?? body?.items ?? []
  if (!Array.isArray(rows)) throw new Error('Invalid bid API response')
  return rows.filter((item: Record<string, unknown>) => developmentTerms.test(String(item.bidNtceNm ?? ''))).map((item: Record<string, unknown>) => ({
    id: safeText(item.bidNtceNo) + '-' + safeText(item.bidNtceOrd),
    title: safeText(item.bidNtceNm),
    organization: safeText(item.dminsttNm ?? item.ntceInsttNm) || '나라장터',
    category: '개발·IT 입찰',
    description: safeText(item.ntceInsttNm),
    period: safeText(item.bidBeginDt) + ' ~ ' + safeText(item.bidClseDt),
    url: safeUrl(item.bidNtceDtlUrl),
    tags: ['용역', '나라장터'],
  })).filter((item: Opportunity) => item.title && item.url)
}
const collectors: Record<Source, () => Promise<Opportunity[]>> = { support: collect, events: collectEvents, bids: collectBids }
const configured = (source: Source) => Boolean((source === 'support' ? process.env.BIZINFO_API_KEY : source === 'events' ? process.env.BIZINFO_EVENT_API_KEY : process.env.DATA_GO_KR_SERVICE_KEY)?.trim())

const databaseUrl = process.env.OPPORTUNITIES_DATABASE_URL || process.env.BOOKMARKS_DATABASE_URL
const sql = databaseUrl ? postgres(databaseUrl, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false }) : null
let syncing = false
@Public()
@Controller('owner/opportunities')
export class OpportunitiesController {
  @Get('feed')
  async feed(@Headers('authorization') authorization: string | undefined, @Query('source') requested?: string, @Query('q') q?: string, @Query('skill') skill?: string, @Query('sort') sort?: string, @Query('page') rawPage?: string) {
    await requireOwnerFromBearer(authorization)
    if (!sql) return {items:[],total:0,page:1,pages:0,status:'setup_required',fetchedAt:null}
    const source:Source = requested === 'events' || requested === 'bids' ? requested : 'support'
    const page=Math.min(10000,Math.max(1,parseInt(rawPage||'1',10)||1))
    const query=(q||'').trim().slice(0,100)
    const keyword=(skill||'').trim().slice(0,40)
    const term='%'+query+'%'
    const tech='%'+keyword+'%'
    const where=sql`source=${source} and (${query}='' or title ilike ${term} or description ilike ${term} or organization ilike ${term}) and (${keyword}='' or title ilike ${tech} or description ilike ${tech})`
    const order=sort==='oldest'?sql`updated_at asc`:sort==='title'?sql`title asc`:sql`updated_at desc`
    const [rows,counts,history]=await Promise.all([
      sql`select external_id,title,organization,description,category,period,url,tags from opportunities.items where ${where} order by ${order} limit 20 offset ${(page-1)*20}`,
      sql`select count(*)::int as total from opportunities.items where ${where}`,
      sql`select synced_at from opportunities.sync_history where source=${source}`,
    ])
    const total=Number(counts[0]?.total||0)
    return {items:rows.map(r=>({id:r.external_id,title:r.title,organization:r.organization,description:r.description,category:r.category,period:r.period,url:r.url,tags:r.tags})),total,page,pages:Math.ceil(total/20),status:'ready',fetchedAt:history[0]?.synced_at||null}
  }

  @Post('sync')
  async sync(@Headers('authorization') authorization:string|undefined,@Query('source') requested?:string) {
    await requireOwnerFromBearer(authorization)
    if (!sql) throw new ServiceUnavailableException('Opportunity database is not configured')
    const source:Source=requested==='events'||requested==='bids'?requested:'support'
    if (!configured(source)) throw new ServiceUnavailableException('Upstream API key is missing')
    if (syncing) return {status:'busy'}
    syncing=true
    try {
      const items=await collectors[source]()
      await sql.begin(async tx=>{
        for(const item of items){
          await tx`insert into opportunities.items(source,external_id,title,organization,description,category,period,url,tags)
          values(${source},${item.id},${item.title},${item.organization},${item.description},${item.category},${item.period},${item.url},${item.tags})
          on conflict(source,external_id) do update set title=excluded.title,organization=excluded.organization,description=excluded.description,category=excluded.category,period=excluded.period,url=excluded.url,tags=excluded.tags,updated_at=now()`
        }
        await tx`insert into opportunities.sync_history(source,synced_at,item_count) values(${source},now(),${items.length}) on conflict(source) do update set synced_at=excluded.synced_at,item_count=excluded.item_count`
      })
      return {status:'ready',source,imported:items.length,syncedAt:new Date().toISOString()}
    } finally {syncing=false}
  }


}
