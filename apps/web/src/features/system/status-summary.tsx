import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppShinyText, ClockIcon, MonitorCheckIcon, RadioTowerIcon } from '../../components/common'
import { StatusChip } from '../monitor/status-chip'
import { loadMonitorStatus } from './monitor-api'

const gib = (n: number) => (n / 1024 ** 3).toFixed(1)
const ratio = (used: number, total: number) => (total > 0 ? (used / total) * 100 : 0)

function StatPill({
  label,
  value,
  percent,
  detail,
}: {
  label: string
  value: string
  percent?: number
  detail?: string
}) {
  const clamped = percent !== undefined ? Math.min(Math.max(percent, 0), 100) : undefined

  return (
    <div className="group min-w-0 rounded-xl border border-border/70 bg-background/50 p-3 backdrop-blur-xs transition-colors hover:border-primary/40 hover:bg-background/80">
      <div className="flex items-center justify-between gap-1">
        <p className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
        {detail && (
          <span className="truncate font-mono text-[10px] text-muted-foreground/75">
            {detail}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate font-mono text-base font-semibold tabular-nums text-foreground">{value}</p>
      {clamped !== undefined ? (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted/70">
          <div
            className="h-full rounded-full bg-primary/85 transition-all duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      ) : (
        <div className="mt-2.5 h-1 w-full rounded-full bg-muted/30" />
      )}
    </div>
  )
}

/** Lightweight dashboard strip. Detail charts live on /monitor. */
export function StatusSummary() {
  const enabled = import.meta.env.DEV
  const query = useQuery({
    queryKey: ['monitor', 'heartbeat', import.meta.env.VITE_MONITOR_DEVICE_ID],
    queryFn: loadMonitorStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
    enabled,
  })

  if (!enabled) {
    return (
      <section aria-label="현황 요약" className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/75 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">현황 요약</h2>
          <Link to="/monitor" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            Mac Monitor
          </Link>
        </div>
        <p role="status" className="mt-1 text-sm text-muted-foreground">아직 수집된 상태가 없습니다.</p>
      </section>
    )
  }

  if (query.isPending) {
    return (
      <section aria-label="현황 요약" className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/75 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">현황 요약</h2>
          <p role="status" className="text-sm text-muted-foreground">
            <AppShinyText>현황을 불러오는 중…</AppShinyText>
          </p>
        </div>
      </section>
    )
  }

  if (!query.data) {
    return (
      <section aria-label="현황 요약" className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/75 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">현황 요약</h2>
          <Link to="/monitor" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            Mac Monitor
          </Link>
        </div>
        <p role="status" className="mt-1 text-sm text-muted-foreground">
          {query.isError ? '상태를 확인할 수 없습니다.' : '아직 수집된 상태가 없습니다.'}
        </p>
      </section>
    )
  }

  const { status, lastSeenAt, macMetrics, bridge } = query.data
  const memoryUsed = macMetrics ? macMetrics.memoryTotalBytes - (macMetrics.memoryAvailableBytes ?? (macMetrics.memoryTotalBytes - macMetrics.memoryUsedBytes)) : 0
  const macLabel = query.isError ? '확인 불가' : status === 'online' ? '온라인'
    : status === 'offline' ? '오프라인' : '미확인'
  const macTone = query.isError ? 'error'
    : status === 'online' ? 'online'
    : status === 'offline' ? 'offline' : 'unknown'
  const now = Date.now()
  const bridgeTime = bridge ? Date.parse(bridge.checkedAt) : NaN
  const bridgeStale = query.isError || status !== 'online' || !Number.isFinite(bridgeTime) ||
    bridgeTime > now || now - bridgeTime > 120_000
  const bridgeTone = !bridge ? 'unknown' : bridgeStale ? 'unknown' : bridge.reachable ? 'online' : 'offline'
  const bridgeChip = !bridge ? '없음' : bridgeStale ? '대기' : bridge.reachable ? 'OK' : '끊김'
  const metricTime = macMetrics ? Date.parse(macMetrics.recordedAt) : NaN
  const metricsStale = query.isError || status !== 'online' || !Number.isFinite(metricTime) ||
    metricTime > now || now - metricTime > 120_000

  return (
    <section aria-label="현황 요약" className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/75 p-4 sm:p-5 backdrop-blur-md shadow-xs transition-colors hover:border-border">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">현황 요약</h2>
          <p role="status" className="sr-only">Mac 연결: {macLabel}</p>
          <StatusChip tone={macTone} label={`Mac ${macLabel}`} />
          <span className="inline-flex items-center gap-1.5">
            <RadioTowerIcon size={14} className="text-chart-2" aria-hidden="true" />
            <StatusChip tone={bridgeTone} label={`Bridge ${bridgeChip}`} />
          </span>
          {metricsStale && macMetrics && (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 font-mono text-[11px] text-warning-foreground">실시간 아님</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastSeenAt && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <ClockIcon size={13} className="text-primary/80" />
              <span className="font-mono text-[11px] tabular-nums">{new Date(lastSeenAt).toLocaleString('ko-KR')}</span>
            </p>
          )}
          <Link
            to="/monitor"
            className="group/link inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1 text-xs font-medium text-primary transition-all hover:border-primary/40 hover:bg-background/80"
          >
            <MonitorCheckIcon size={13} />
            <span>상세 보기</span>
            <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      {macMetrics ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatPill
            label="CPU"
            value={`${macMetrics.cpuPercent.toFixed(1)}%`}
            percent={macMetrics.cpuPercent}
            detail={`${macMetrics.cpuCores} Cores`}
          />
          <StatPill
            label="메모리"
            value={`${ratio(memoryUsed, macMetrics.memoryTotalBytes).toFixed(0)}%`}
            percent={ratio(memoryUsed, macMetrics.memoryTotalBytes)}
            detail={`${gib(memoryUsed)} / ${gib(macMetrics.memoryTotalBytes)} GiB · 추정`}
          />
          <StatPill
            label="디스크"
            value={`${ratio(macMetrics.diskUsedBytes, macMetrics.diskTotalBytes).toFixed(0)}%`}
            percent={ratio(macMetrics.diskUsedBytes, macMetrics.diskTotalBytes)}
            detail={`${gib(macMetrics.diskUsedBytes)} / ${gib(macMetrics.diskTotalBytes)} GiB`}
          />
          <StatPill
            label="프로세스"
            value={`${macMetrics.processCount}개`}
            detail="tasks active"
          />
        </div>
      ) : (
        <p role="status" className="mt-2 text-sm text-muted-foreground">지표가 아직 없습니다. Monitor에서 확인하세요.</p>
      )}
    </section>
  )
}
