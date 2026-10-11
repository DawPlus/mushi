import postgres from 'postgres'
import type { TrendingRepo } from './github-trending.js'

export function createTrendingStore(connection: string) {
  const sql = postgres(connection, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false })
  return {
    async list(date: string): Promise<TrendingRepo[]> {
      const rows = await sql<{
        rank: number; repo_name: string; repo_url: string; description: string;
        description_ko: string; language: string; stars_today: number | null; stars_total: number | null; forks_total: number | null
      }[]>`
        select rank,repo_name,repo_url,description,description_ko,language,stars_today,stars_total,forks_total
        from trending.daily_repositories where trending_date=${date}::date order by rank`
      return rows.map(row => ({
        rank: row.rank, name: row.repo_name, url: row.repo_url,
        description: row.description, koreanDescription: row.description_ko,
        language: row.language, starsToday: row.stars_today, starsTotal: row.stars_total == null ? null : Number(row.stars_total), forksTotal: row.forks_total == null ? null : Number(row.forks_total),
      }))
    },
    async patchMetrics(date: string, name: string, stars: number | null, forks: number | null): Promise<void> {
      await sql`update trending.daily_repositories set stars_total=coalesce(stars_total,${stars}),forks_total=coalesce(forks_total,${forks})
        where trending_date=${date}::date and repo_name=${name}`
    },
    async save(date: string, items: TrendingRepo[]): Promise<void> {
      await sql.begin(async tx => {
        for (const item of items) {
          await tx`
            insert into trending.daily_repositories
            (trending_date,rank,repo_name,repo_url,description,description_ko,language,stars_today,stars_total,forks_total)
            values (${date}::date,${item.rank},${item.name},${item.url},${item.description},
              ${item.koreanDescription ?? ''},${item.language},${item.starsToday},${item.starsTotal ?? null},${item.forksTotal ?? null})
            on conflict (trending_date,rank) do nothing`
        }
      })
    },
  }
}
