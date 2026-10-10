import { AppNumberTicker, CpuIcon, HardDriveDownloadIcon, MetricBar, ServerIcon } from '../../components/common'
import { SegmentedBar } from '../monitor/segmented-bar'

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

type MacStatusProps =
  | { state: 'loading' | 'error' | 'empty'; snapshot?: never; embedded?: boolean }
  | { state: 'ready'; snapshot: MacSnapshot; embedded?: boolean }

const gib = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GiB`
const duration = (seconds: number) => `${Math.floor(seconds / 86400)}일 ${Math.floor((seconds % 86400) / 3600)}시간`
const ratio = (used: number, total: number) => (total > 0 ? (used / total) * 100 : 0)

export function MacStatus(props: MacStatusProps) {
  const shell = props.embedded
    ? 'grid gap-3'
    : 'grid gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5'

  if (props.state !== 'ready') {
    const message = props.state === 'loading' ? '상태를 불러오는 중…'
      : props.state === 'error' ? '상태를 확인할 수 없습니다.' : '아직 수집된 상태가 없습니다.'
    return (
      <section aria-label="Mac mini 상태" className={shell}>
        <h2 className="text-sm font-medium text-muted-foreground">Mac mini 상태</h2>
        <p role="status" className="text-sm text-muted-foreground">{message}</p>
      </section>
    )
  }

  const snapshot = props.snapshot
  const estimatedMemoryUsed = snapshot.memoryTotalBytes - (snapshot.memoryAvailableBytes ?? (snapshot.memoryTotalBytes - snapshot.memoryUsedBytes))
  const memPct = ratio(estimatedMemoryUsed, snapshot.memoryTotalBytes)
  const diskPct = ratio(snapshot.diskUsedBytes, snapshot.diskTotalBytes)

  return (
    <section aria-label="Mac mini 상태" className={shell}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Mac mini 상태</h2>
        <p className="text-xs text-muted-foreground">
          마지막 수집: <span className="font-mono tabular-nums">{new Date(snapshot.recordedAt).toLocaleString('ko-KR')}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CpuIcon size={14} className="text-primary" />
              CPU
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              <AppNumberTicker value={snapshot.cpuPercent} decimalPlaces={1} />
              <span className="text-xs text-muted-foreground">%</span>
            </span>
          </div>
          <MetricBar
            label="CPU"
            valueLabel={`${snapshot.cpuPercent.toFixed(1)}% (${snapshot.cpuCores}코어)`}
            percent={snapshot.cpuPercent}
            tone={1}
          />
          <p className="text-xs text-muted-foreground font-mono tabular-nums">{snapshot.cpuCores}코어</p>
        </div>

        <div className="grid gap-2 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardDriveDownloadIcon size={14} className="text-chart-2" />
              메모리
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{memPct.toFixed(0)}%</span>
          </div>
          <SegmentedBar
            label="메모리"
            usedLabel={`${gib(estimatedMemoryUsed)} / ${gib(snapshot.memoryTotalBytes)}`}
            percent={memPct}
            segments={16}
          />
        </div>

        <div className="grid gap-2 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ServerIcon size={14} className="text-chart-5" />
              디스크
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{diskPct.toFixed(0)}%</span>
          </div>
          <MetricBar
            label="디스크"
            valueLabel={`${gib(snapshot.diskUsedBytes)} / ${gib(snapshot.diskTotalBytes)}`}
            percent={diskPct}
            tone={5}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <p>가동 시간: <span className="font-mono tabular-nums text-foreground">{duration(snapshot.uptimeSeconds)}</span></p>
        <p>실행 중 프로세스: <span className="font-mono tabular-nums text-foreground">{snapshot.processCount}개</span></p>
      </div>
    </section>
  )
}
