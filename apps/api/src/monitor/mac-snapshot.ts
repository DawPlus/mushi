export type MacSnapshot = {
  recordedAt: string
  cpuPercent: number
  cpuCores: number
  memoryUsedBytes: number
  memoryTotalBytes: number
  memoryAvailableBytes?: number
  swapUsedBytes?: number
  swapTotalBytes?: number
  diskUsedBytes: number
  diskTotalBytes: number
  uptimeSeconds: number
  processCount: number
}

const keys = [
  'recordedAt', 'cpuPercent', 'cpuCores', 'memoryUsedBytes', 'memoryTotalBytes',
  'diskUsedBytes', 'diskTotalBytes', 'uptimeSeconds', 'processCount',
]

export function parseMacSnapshot(value: unknown): MacSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (keys.some(key => !(key in data))) return null
  const optional = ['memoryAvailableBytes', 'swapUsedBytes', 'swapTotalBytes']
  if (Object.keys(data).some(key => !keys.includes(key) && !optional.includes(key))) return null
  for (const key of optional) if (data[key] !== undefined && (typeof data[key] !== 'number' || !Number.isFinite(data[key]) || (data[key] as number) < 0)) return null
  if ((data.memoryAvailableBytes as number | undefined) !== undefined && (data.memoryAvailableBytes as number) > (data.memoryTotalBytes as number)) return null
  if ((data.swapUsedBytes as number | undefined) !== undefined && (data.swapTotalBytes as number | undefined) !== undefined && (data.swapUsedBytes as number) > (data.swapTotalBytes as number)) return null
  const numbers: [keyof MacSnapshot, number, number][] = [
    ['cpuPercent', 0, 100], ['cpuCores', 1, 1024],
    ['memoryUsedBytes', 0, Number.MAX_SAFE_INTEGER],
    ['memoryTotalBytes', 1, Number.MAX_SAFE_INTEGER],
    ['diskUsedBytes', 0, Number.MAX_SAFE_INTEGER],
    ['diskTotalBytes', 1, Number.MAX_SAFE_INTEGER],
    ['uptimeSeconds', 0, 1e10], ['processCount', 0, 1e7],
  ]
  for (const [key, min, max] of numbers) {
    const n = data[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) return null
  }
  if (
    (data.memoryUsedBytes as number) > (data.memoryTotalBytes as number) ||
    (data.diskUsedBytes as number) > (data.diskTotalBytes as number)
  ) return null
  if (
    typeof data.recordedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.recordedAt) ||
    !Number.isFinite(Date.parse(data.recordedAt))
  ) return null
  return data as MacSnapshot
}
