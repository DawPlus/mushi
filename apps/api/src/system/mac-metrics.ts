import os from 'node:os'
import { statfs } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
type CpuTimes = { idle: number; total: number }
function cpuTimes(): CpuTimes {
  const values = os.cpus().map(({ times }) => ({ idle: times.idle, total: Object.values(times).reduce((a, b) => a + b, 0) }))
  return { idle: values.reduce((n, c) => n + c.idle, 0), total: values.reduce((n, c) => n + c.total, 0) }
}

export async function collectMacMetrics(wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (process.platform !== 'darwin') throw new Error('macOS required')
  const before = cpuTimes()
  await wait(250)
  const after = cpuTimes()
  const elapsed = after.total - before.total
  const disk = await statfs(os.homedir())
  const memoryDetails = await collectMemoryDetails(os.totalmem())
  const { stdout } = await exec('ps', ['-A', '-o', 'pid='], { timeout: 3000, maxBuffer: 1024 * 1024 })
  return {
    recordedAt: new Date().toISOString(),
    cpuPercent: elapsed > 0 ? Math.round((1 - (after.idle - before.idle) / elapsed) * 1000) / 10 : 0,
    cpuCores: os.cpus().length,
    memoryUsedBytes: os.totalmem() - os.freemem(),
    memoryTotalBytes: os.totalmem(),
    ...memoryDetails,
    diskUsedBytes: (disk.blocks - disk.bfree) * disk.bsize,
    diskTotalBytes: disk.blocks * disk.bsize,
    uptimeSeconds: Math.floor(os.uptime()),
    processCount: stdout.split('\n').filter(line => line.trim()).length,
  }
}


const run = promisify(execFile)
const bytes = (s: string) => {
  const match = /([\d.]+)\s*([KMGT])?/i.exec(s)
  if (!match) return null
  const factor = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[match[2]?.toUpperCase() as 'K'|'M'|'G'|'T'] ?? 1
  return Number(match[1]) * factor
}

/** Available memory is an estimate, not Apple's memory pressure. */
export function parseVmStat(raw: string, total: number) {
  const pageSize = Number(/page size of (\d+) bytes/.exec(raw)?.[1] ?? 4096)
  const pages = (name: string) => Number(new RegExp('^Pages '+name+':\\s*([\\d.]+)', 'mi').exec(raw)?.[1]?.replaceAll('.', '') ?? NaN)
  const free = pages('free'), inactive = pages('inactive'), speculative = pages('speculative')
  if (![pageSize, free, inactive, speculative].every(Number.isFinite)) return null
  const available = Math.min(total, (free + inactive + speculative) * pageSize)
  return { memoryAvailableBytes: Math.max(0, available) }
}

export function parseSwapUsage(raw: string) {
  const match = /total\s*=\s*([\d.]+[KMGT]?)\s+used\s*=\s*([\d.]+[KMGT]?)/i.exec(raw)
  if (!match) return null
  const total = bytes(match[1]), used = bytes(match[2])
  if (total === null || used === null || used > total) return null
  return { swapUsedBytes: used, swapTotalBytes: total }
}

export async function collectMemoryDetails(total: number) {
  const result: { memoryAvailableBytes?: number; swapUsedBytes?: number; swapTotalBytes?: number } = {}
  try {
    const { stdout } = await run('/usr/bin/vm_stat', [], { timeout: 2500, maxBuffer: 16384 })
    Object.assign(result, parseVmStat(stdout, total))
  } catch {}
  try {
    const { stdout } = await run('/usr/sbin/sysctl', ['vm.swapusage'], { timeout: 2500, maxBuffer: 4096 })
    Object.assign(result, parseSwapUsage(stdout))
  } catch {}
  return result
}
