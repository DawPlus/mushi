export function validObservedAt(value: unknown, now = Date.now()): value is string {
  if (typeof value !== 'string') return false
  const milliseconds = Date.parse(value)
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value && Math.abs(now - milliseconds) <= 300_000
}
