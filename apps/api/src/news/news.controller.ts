import { Controller, Get, Query, ServiceUnavailableException, BadRequestException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { fetchRepoMetrics, getGithubTrending, seoulDateKey } from './github-trending.js'
import { createTrendingStore } from './trending-store.js'

let storeInstance: ReturnType<typeof createTrendingStore> | undefined
function store() {
  const connection = process.env.TRENDING_DATABASE_URL || process.env.BOOKMARKS_DATABASE_URL
  if (!connection) throw new ServiceUnavailableException('Trending database is not configured')
  return storeInstance ??= createTrendingStore(connection)
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/
let inFlight: Promise<unknown> | undefined
let metricsInFlight: Promise<unknown> | undefined

@Controller('public/github-trending')
export class GithubTrendingController {
  @Public()
  @Get()
  async list(@Query('date') requested?: string) {
    const today = seoulDateKey()
    const date = requested || today
    if (!datePattern.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date || date > today) {
      throw new BadRequestException('Choose a valid date not later than today')
    }
    const db = store()
    try {
      const existing = await db.list(date)
      if (existing.length === 5) {
        if (date === today && existing.some(repo => repo.starsTotal == null || repo.forksTotal == null)) {
          if (!metricsInFlight) metricsInFlight = Promise.all(existing.filter(repo => repo.starsTotal == null || repo.forksTotal == null).map(async repo => {
            const values = await fetchRepoMetrics(repo.name)
            if (values.starsTotal !== null || values.forksTotal !== null) await db.patchMetrics(date, repo.name, values.starsTotal, values.forksTotal)
          })).finally(() => { metricsInFlight = undefined })
          await metricsInFlight
          return { items: await db.list(date), date, source: 'archive', collected: false }
        }
        return { items: existing, date, source: 'archive', collected: false }
      }
      if (date !== today) return { items: existing, date, source: 'archive', collected: false }
      if (!inFlight) inFlight = (async () => {
        const items = await getGithubTrending()
        await db.save(date, items)
        return db.list(date)
      })().finally(() => { inFlight = undefined })
      const items = await inFlight as Awaited<ReturnType<typeof getGithubTrending>>
      return { items, date, source: 'github', collected: true }
    } catch {
      throw new ServiceUnavailableException('GitHub Trending archive temporarily unavailable')
    }
  }
}
