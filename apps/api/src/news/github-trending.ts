export type TrendingRepo = {
  rank: number
  name: string
  url: string
  description: string
  koreanDescription?: string
  language: string
  starsToday: number | null
  starsTotal?: number | null
  forksTotal?: number | null
}

const decode = (input: string): string => input
  .replace(/<[^>]*>/g, ' ')
  .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, match => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
  })[match] ?? match)
  .replace(/\s+/g, ' ').trim()

/** Parses the displayed order, not the GitHub Search API's star ranking. */
export function parseGithubTrending(html: string): TrendingRepo[] {
  const rows = html.split(/<article\b[^>]*class="[^"]*Box-row[^"]*"[^>]*>/i).slice(1)
  const repos: TrendingRepo[] = []
  for (const row of rows) {
    const header = row.match(/<h2\b[^>]*>[\s\S]*?<a\b[^>]*href="\/(?!login\b)([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)"[^>]*>[\s\S]*?<\/a>/i)
    if (!header) continue
    const name = header[1]
    const description = row.match(/<p\b[^>]*class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
    const language = row.match(/<span\b[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i)
    const starsToday = row.match(/([\d,]+)\s+stars\s+today/i)
    repos.push({
      rank: repos.length + 1,
      name,
      url: 'https://github.com/' + name,
      description: description ? decode(description[1]).slice(0, 300) : '',
      language: language ? decode(language[1]).slice(0, 60) : '',
      starsToday: starsToday ? Number(starsToday[1].replaceAll(',', '')) : null,
    })
    if (repos.length === 5) break
  }
  return repos
}

export const seoulDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

async function translateDescription(description: string): Promise<string> {
  if (!description) return ''
  try {
    const endpoint = new URL('https://api.mymemory.translated.net/get')
    endpoint.searchParams.set('q', description.slice(0, 450))
    endpoint.searchParams.set('langpair', 'en|ko')
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5500), redirect: 'error' })
    if (!response.ok) return ''
    const result = await response.json() as { responseStatus?: number; responseData?: { translatedText?: unknown } }
    const translated = result.responseData?.translatedText
    if (result.responseStatus !== 200 || typeof translated !== 'string' || /^(MYMEMORY WARNING|QUERY LENGTH LIMIT)/i.test(translated)) return ''
    return translated.replace(/<[^>]*>/g, '').trim().slice(0, 500)
  } catch { return '' }
}

export async function fetchRepoMetrics(name: string): Promise<{ starsTotal: number | null; forksTotal: number | null }> {
  try {
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(name)) return { starsTotal: null, forksTotal: null }
    const response = await fetch('https://api.github.com/repos/' + name, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mushi-Trending-Reader/1.0' },
      signal: AbortSignal.timeout(4500), redirect: 'error',
    })
    if (!response.ok) return { starsTotal: null, forksTotal: null }
    const data = await response.json() as { stargazers_count?: unknown; forks_count?: unknown }
    return {
      starsTotal: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
      forksTotal: typeof data.forks_count === 'number' ? data.forks_count : null,
    }
  } catch { return { starsTotal: null, forksTotal: null } }
}

let cache: { date: string; value: TrendingRepo[] } | undefined
let inflight: Promise<TrendingRepo[]> | undefined
export async function getGithubTrending(): Promise<TrendingRepo[]> {
  const date = seoulDateKey()
  if (cache && cache.date === date) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    const response = await fetch('https://github.com/trending?since=daily', {
      headers: { Accept: 'text/html', 'User-Agent': 'Mushi-Trending-Reader/1.0' },
      signal: AbortSignal.timeout(9000),
      redirect: 'error',
    })
    if (!response.ok) throw new Error('GitHub Trending HTTP ' + response.status)
    const html = await response.text()
    if (html.length > 2_000_000) throw new Error('Unexpected response size')
    const data = parseGithubTrending(html)
    if (data.length !== 5) throw new Error('GitHub Trending page format changed')
    const translated = await Promise.all(data.map(async repo => {
      const [koreanDescription, metrics] = await Promise.all([translateDescription(repo.description), fetchRepoMetrics(repo.name)])
      return { ...repo, koreanDescription, ...metrics }
    }))
    cache = { date, value: translated }
    return translated
  })()
  try { return await inflight } catch (e) {
    if (cache) return cache.value
    throw e
  } finally { inflight = undefined }
}
