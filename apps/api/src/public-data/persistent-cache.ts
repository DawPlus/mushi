import postgres from 'postgres'

type Key = 'weather' | 'air-quality' | 'fx' | 'kospi'
type Entry<T> = { value: T; fetchedAt: number }
const ttl: Record<Key, number> = { weather: 3_600_000, 'air-quality': 3_600_000, fx: 86_400_000, kospi: 86_400_000 }
const memory = new Map<Key, Entry<unknown>>()
const pending = new Map<Key, Promise<unknown>>()
const lastAttempt = new Map<Key, number>()
const RETRY_COOLDOWN_MS = 5 * 60_000
let database: ReturnType<typeof postgres> | undefined
function db() {
  const url = process.env.PUBLIC_DATA_DATABASE_URL || process.env.BOOKMARKS_DATABASE_URL
  if (!url) return undefined
  return database ??= postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false })
}
async function read<T>(key: Key): Promise<Entry<T> | undefined> {
  const cached = memory.get(key) as Entry<T> | undefined
  if (cached) return cached
  const sql = db()
  if (!sql) return undefined
  const rows = await sql<{ payload: T; fetched_at: Date }[]>`select payload,fetched_at from public_data.cache where cache_key=${key} limit 1`
  if (!rows[0]) return undefined
  const entry = { value: rows[0].payload, fetchedAt: new Date(rows[0].fetched_at).getTime() }
  memory.set(key, entry)
  return entry
}
async function refresh<T>(key: Key, fetcher: () => Promise<T>): Promise<T> {
  const running = pending.get(key) as Promise<T> | undefined
  if (running) return running
  lastAttempt.set(key, Date.now())
  const promise = (async () => {
    const value = await fetcher()
    const sql = db()
    if (sql) await sql`insert into public_data.cache(cache_key,payload,fetched_at) values(${key},${sql.json(JSON.parse(JSON.stringify(value)))},now()) on conflict(cache_key) do update set payload=excluded.payload,fetched_at=excluded.fetched_at`
    memory.set(key, { value, fetchedAt: Date.now() })
    return value
  })()
  pending.set(key, promise)
  try { return await promise } finally { if (pending.get(key) === promise) pending.delete(key) }
}
export async function getPublicData<T>(key: Key, fetcher: () => Promise<T>): Promise<T> {
  let cached: Entry<T> | undefined
  try { cached = await read<T>(key) } catch { cached = memory.get(key) as Entry<T> | undefined }
  if (cached) {
    if (Date.now() - cached.fetchedAt >= ttl[key] && Date.now() - (lastAttempt.get(key) ?? 0) >= RETRY_COOLDOWN_MS) {
      void refresh(key, fetcher).catch(() => undefined)
    }
    return cached.value
  }
  return refresh(key, fetcher)
}
