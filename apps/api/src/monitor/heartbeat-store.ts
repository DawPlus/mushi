import postgres from 'postgres'
import { parseMacSnapshot, type MacSnapshot } from './mac-snapshot.js'
import { parseBridgeState, type BridgeState } from './bridge-state.js'

export class HeartbeatRejectedError extends Error {}

export type AuthenticatedDevice = {
  deviceId: string
  ownerId: string
}

type Row = {
  device_id: string
  owner_id: string
  last_seen_at: Date
  agent_version: string | null
  state: unknown
}

export type Heartbeat = {
  deviceId: string
  ownerId: string
  lastSeenAt: Date
  agentVersion: string | null
  macMetrics: MacSnapshot | null
  bridge: BridgeState | null
}

function toHeartbeat(row: Row): Heartbeat {
  const state = row.state && typeof row.state === 'object' ? row.state as Record<string, unknown> : {}
  return {
    deviceId: row.device_id,
    ownerId: row.owner_id,
    lastSeenAt: row.last_seen_at,
    agentVersion: row.agent_version,
    macMetrics: parseMacSnapshot(state.macMetrics),
    bridge: parseBridgeState(state.bridge),
  }
}

/** Use only server-verified owner/device identities and prevalidated metrics. */
export function createHeartbeatStore(url: string) {
  if (!url) throw new Error('Monitor DATABASE_URL is required')
  const sql = postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false })
  return {
    async record(device: AuthenticatedDevice, agentVersion: string | null = null, metrics: MacSnapshot | null = null, bridge: BridgeState | null = null, observedAt: string): Promise<Heartbeat> {
      const state = sql.json({ ...(metrics ? { macMetrics: metrics } : {}), ...(bridge ? { bridge } : {}), observedAt })
      const [row] = await sql<Row[]>`
        INSERT INTO monitor.device_heartbeats (device_id, owner_id, last_seen_at, agent_version, state)
        VALUES (${device.deviceId}, ${device.ownerId}, now(), ${agentVersion}, ${state})
        ON CONFLICT (device_id)
        DO UPDATE SET last_seen_at = now(),
          agent_version = excluded.agent_version,
          state = monitor.device_heartbeats.state || excluded.state
        WHERE monitor.device_heartbeats.owner_id = excluded.owner_id
          AND (NOT (monitor.device_heartbeats.state ? 'observedAt')
            OR monitor.device_heartbeats.state->>'observedAt' < ${observedAt})
        RETURNING device_id, owner_id, last_seen_at, agent_version, state
      `
      if (!row) throw new HeartbeatRejectedError('Heartbeat rejected (stale or mismatched device)')
      if (metrics) {
        // History is an optional new table until its migration has been applied.
        await sql`INSERT INTO monitor.metric_history (device_id, owner_id, recorded_at, cpu_percent, memory_used_bytes, memory_total_bytes)
          VALUES (${device.deviceId}, ${device.ownerId}, ${metrics.recordedAt}, ${metrics.cpuPercent}, ${metrics.memoryUsedBytes}, ${metrics.memoryTotalBytes})
          ON CONFLICT (device_id, recorded_at) DO NOTHING`.catch(() => undefined)
      }
      return toHeartbeat(row)
    },
    async lastSeen(device: AuthenticatedDevice): Promise<Heartbeat | null> {
      const [row] = await sql<Row[]>`
        SELECT device_id, owner_id, last_seen_at, agent_version, state
        FROM monitor.device_heartbeats
        WHERE device_id = ${device.deviceId} AND owner_id = ${device.ownerId}
        LIMIT 1
      `
      return row ? toHeartbeat(row) : null
    },
    async history(device: AuthenticatedDevice, since: Date, limit: number) {
      const rows = await sql<{ recorded_at: Date; cpu_percent: number; memory_used_bytes: number; memory_total_bytes: number }[]>`
        SELECT recorded_at, cpu_percent, memory_used_bytes, memory_total_bytes
        FROM monitor.metric_history WHERE owner_id = ${device.ownerId} AND device_id = ${device.deviceId}
          AND recorded_at >= ${since.toISOString()}
        ORDER BY recorded_at DESC LIMIT ${limit}
      `
      return rows.reverse().map(row => ({ at: row.recorded_at.toISOString(), cpuPercent: row.cpu_percent,
        memoryUsedBytes: Number(row.memory_used_bytes), memoryTotalBytes: Number(row.memory_total_bytes) }))
    },
    close: () => sql.end(),
  }
}
