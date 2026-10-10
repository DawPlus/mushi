export function isMetricsStale(
  recordedAt: string,
  status: 'online' | 'offline' | 'unknown',
  requestFailed: boolean,
  now = Date.now(),
) {
  const timestamp = Date.parse(recordedAt)
  return requestFailed || status !== 'online' || !Number.isFinite(timestamp) ||
    timestamp > now || now - timestamp > 120_000
}
