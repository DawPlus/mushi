import { useQuery } from '@tanstack/react-query'
import { ClockIcon, RadioTowerIcon } from '../../components/common'
import { StatusChip } from '../monitor/status-chip'
import { MacStatus } from './mac-status'
import { loadMonitorStatus } from './monitor-api'

export function LiveMacStatus() {
  const query = useQuery({
    queryKey: ['monitor', 'heartbeat', import.meta.env.VITE_MONITOR_DEVICE_ID],
    queryFn: loadMonitorStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  })
  if (query.isPending) return <MacStatus state="loading" embedded />
  if (!query.data) return <MacStatus state={query.isError ? 'error' : 'empty'} embedded />

  const { status, lastSeenAt, macMetrics, bridge } = query.data
  const statusLabel = query.isError ? '확인 불가' : status === 'online' ? '온라인'
    : status === 'offline' ? '오프라인' : '미확인'
  const statusTone = query.isError ? 'error'
    : status === 'online' ? 'online'
    : status === 'offline' ? 'offline' : 'unknown'
  const now = Date.now()
  const metricTime = macMetrics ? Date.parse(macMetrics.recordedAt) : NaN
  const metricsStale = query.isError || status !== 'online' || !Number.isFinite(metricTime) ||
    metricTime > now || now - metricTime > 120_000
  const bridgeTime = bridge ? Date.parse(bridge.checkedAt) : NaN
  const bridgeStale = query.isError || status !== 'online' || !Number.isFinite(bridgeTime) ||
    bridgeTime > now || now - bridgeTime > 120_000
  const bridgeLabel = !bridge ? '확인되지 않음'
    : bridgeStale ? bridge.reachable ? '이전에는 연결됨 (실시간 아님)' : '이전에는 연결 안 됨 (실시간 아님)'
    : bridge.reachable ? '정상' : '연결 안 됨'
  const bridgeTone = !bridge ? 'unknown'
    : bridgeStale ? 'unknown'
    : bridge.reachable ? 'online' : 'offline'

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="sr-only">Mac 연결: {statusLabel}</p>
        <StatusChip tone={statusTone} label={`Mac ${statusLabel}`} />
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1">
          <RadioTowerIcon size={14} className="text-chart-2" />
          <span className="text-xs text-muted-foreground">Onion Bridge</span>
          <StatusChip tone={bridgeTone} label={bridgeLabel.includes('정상') ? '정상' : bridgeLabel.includes('연결 안') || bridgeLabel.includes('안 됨') ? '끊김' : '대기'} />
        </div>
        {lastSeenAt && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon size={13} className="text-primary" />
            <span className="font-mono tabular-nums">{new Date(lastSeenAt).toLocaleString('ko-KR')}</span>
          </p>
        )}
      </div>

      {macMetrics ? (
        <>
          {metricsStale && (
            <p role="note" className="text-sm text-muted-foreground">
              이전 수집 정보 (실시간이 아님){lastSeenAt ? ' · 마지막 체크인 ' + new Date(lastSeenAt).toLocaleString('ko-KR') : ''}
            </p>
          )}
          <MacStatus state="ready" snapshot={macMetrics} embedded />
        </>
      ) : (
        <MacStatus state="empty" embedded />
      )}

      <p className="sr-only">Onion Bridge: {bridgeLabel}</p>
    </div>
  )
}
