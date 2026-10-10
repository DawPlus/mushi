import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

if (existsSync(new URL('./.env', import.meta.url))) loadEnvFile(new URL('./.env', import.meta.url).pathname)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function resolveEndpoint(base, deviceId) {
  if (!UUID.test(deviceId || '')) throw new Error('Invalid MONITOR_DEVICE_ID')
  const url = new URL(base)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))) {
    throw new Error('API must use HTTPS, except local loopback HTTP')
  }
  return new URL('devices/' + deviceId + '/heartbeat', url)
}

export async function sendCheckin({ apiUrl, deviceId, token, request = fetch, collectMetrics, probeBridge }) {
  if (!token || token.length < 32) throw new Error('Missing device credential')
  const endpoint = resolveEndpoint(apiUrl, deviceId)
  let metrics
  try { metrics = await collectMetrics?.() }
  catch { console.warn('Mac metrics unavailable; sending heartbeat only') }
  let bridge
  try { bridge = await probeBridge?.() }
  catch { console.warn('Onion Bridge probe unavailable; sending heartbeat only') }
  const response = await request(endpoint, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ agentVersion: 'mushi-agent-0.1.0', observedAt: new Date().toISOString(), ...(metrics ? { metrics } : {}), ...(bridge ? { bridge } : {}) }),
  })
  if (!response.ok) throw new Error('Heartbeat rejected: HTTP ' + response.status)
  return response.status
}

export async function runAgent(args = process.argv.slice(2), env = process.env, request = fetch, collectMetrics = async () => {
  const { collectMacMetrics } = await import('../apps/api/src/system/mac-metrics.ts')
  return collectMacMetrics()
}, probeBridge = async () => {
  const { probeOnionBridge } = await import('../apps/api/src/system/onion-status.ts')
  return probeOnionBridge()
}) {
  if (args.length !== 1 || !['--once', '--watch'].includes(args[0])) throw new Error('Usage: node agent/checkin.mjs --once|--watch')
  const config = { apiUrl: env.MONITOR_API_URL, deviceId: env.MONITOR_DEVICE_ID, token: env.MONITOR_DEVICE_TOKEN, request, collectMetrics, probeBridge }
  // Validate the destination and credentials before entering a long-running loop.
  resolveEndpoint(config.apiUrl, config.deviceId)
  if (!config.token || config.token.length < 32) throw new Error('Missing device credential')
  if (args[0] === '--once') {
    const code = await sendCheckin(config)
    return { code: 0, httpStatus: code }
  }
  const interval = Number(env.MONITOR_INTERVAL_SECONDS ?? '90')
  if (!Number.isInteger(interval) || interval < 60 || interval > 3600) throw new Error('Interval must be 60-3600 seconds')
  let active = true
  const stop = () => { active = false }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  try {
    while (active) {
      try { await sendCheckin(config); console.log('heartbeat accepted') }
      catch (e) { console.error(e instanceof Error ? e.message : 'heartbeat error') }
      if (active) await new Promise(resolve => {
        const finish = () => {
          clearTimeout(timer)
          process.removeListener('SIGTERM', finish)
          process.removeListener('SIGINT', finish)
          resolve()
        }
        const timer = setTimeout(finish, interval * 1000)
        process.once('SIGTERM', finish)
        process.once('SIGINT', finish)
      })
    }
  } finally {
    process.removeListener('SIGTERM', stop)
    process.removeListener('SIGINT', stop)
  }
  return { code: 0 }
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  runAgent().then(({ code }) => { if (code) process.exitCode = 1; else if (process.argv.includes('--once')) console.log('heartbeat accepted') }).catch(e => {
    console.error(e instanceof Error ? e.message : 'agent error')
    process.exitCode = 1
  })
}
