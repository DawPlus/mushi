import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import postgres from 'postgres'

if (existsSync(new URL('../.env', import.meta.url))) loadEnvFile(new URL('../.env', import.meta.url).pathname)

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ownerId = process.env.MONITOR_OWNER_ID
if (!uuid.test(ownerId ?? '') || !process.env.DATABASE_URL) {
  console.error('SKIP: Monitor database connection/owner not configured')
  process.exitCode = 2
} else {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false })
  const rollback = Symbol('expected rollback')
  const deviceId = randomUUID()
  const t1 = new Date(Date.now() - 60_000).toISOString()
  const t2 = new Date(Date.now() - 30_000).toISOString()
  try {
    await sql.begin(async tx => {
      const upsert = async (time, owner = ownerId) => {
        const state = tx.json({ observedAt: time })
        return tx`
          INSERT INTO monitor.device_heartbeats (device_id, owner_id, last_seen_at, agent_version, state)
          VALUES (${deviceId}, ${owner}, now(), 'replay-db-test', ${state})
          ON CONFLICT (device_id)
          DO UPDATE SET last_seen_at = now(), state = monitor.device_heartbeats.state || excluded.state
          WHERE monitor.device_heartbeats.owner_id = excluded.owner_id
            AND (NOT (monitor.device_heartbeats.state ? 'observedAt')
              OR monitor.device_heartbeats.state->>'observedAt' < ${time})
          RETURNING device_id
        `
      }
      if ((await upsert(t1)).length !== 1) throw Error('Initial write rejected')
      if ((await upsert(t1)).length !== 0) throw Error('Duplicate was accepted')
      if ((await upsert(new Date(Date.now() - 90_000).toISOString())).length !== 0) throw Error('Stale write was accepted')
      if ((await upsert(t2)).length !== 1) throw Error('Fresh write was rejected')
      if ((await upsert(new Date().toISOString(), randomUUID())).length !== 0) throw Error('Wrong owner accepted')
      throw rollback
    })
    throw Error('Test transaction unexpectedly committed')
  } catch (error) {
    if (error === rollback) {
      const remaining = await sql`SELECT count(*)::int AS total FROM monitor.device_heartbeats WHERE device_id = ${deviceId}`
      if (remaining[0]?.total !== 0) { console.error('FAIL: test row remains after rollback'); process.exitCode = 1 }
      else console.log('PASS: DB duplicate/stale/owner checks; rollback confirmed, no test row remains')
    }
    else { console.error('DB integration check failed:', error instanceof Error ? error.message : 'unknown error'); process.exitCode = 1 }
  } finally { await sql.end() }
}
