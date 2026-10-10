import { useEffect, useState } from 'react'
import {
  AppBlurFade,
  AppBorderBeam,
  AppMagicCard,
  AppNumberTicker,
  AppShinyText,
  BoxesIcon,
  ClockIcon,
  CpuIcon,
  HardDriveDownloadIcon,
  LoaderCircleIcon,
  MetricBar,
  MonitorCheckIcon,
  RadioTowerIcon,
  ServerIcon,
} from '../../components/common'
import { CpuAreaChart } from './cpu-area-chart'
import { isMetricsStale } from './metric-freshness.js'
import { SegmentedBar } from './segmented-bar'
import { StatusChip } from './status-chip'

type MacMetrics = {
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
type Status = {
  status: 'online' | 'offline' | 'unknown'
  lastSeenAt: string | null
  macMetrics?: MacMetrics | null
  bridge?: { reachable: boolean; checkedAt: string; error?: string } | null
}

type CpuSample = { at: number; value: number }

const gib = (n: number) => (n / 1024 ** 3).toFixed(1)
const ratio = (used: number, total: number) => (total > 0 ? (used / total) * 100 : 0)
const MAX_CPU_SAMPLES = 24

function uptimeLabel(seconds: number) {
  return `${Math.floor(seconds / 86400)}일 ${Math.floor((seconds % 86400) / 3600)}시간`
}

export default function Feature({ loadStatus, loadHistory }: { loadStatus?: () => Promise<Status>; loadHistory?: () => Promise<{ at: string; cpuPercent: number }[]> }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState(false)
  const [cpuSamples, setCpuSamples] = useState<CpuSample[]>([])
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    if (!loadStatus) return
    let active = true
    const refresh = async () => {
      try {
        const result = await loadStatus()
        if (!active) return
        setStatus(result)
        setError(false)
        const cpu = result.macMetrics?.cpuPercent
        const at = result.macMetrics?.recordedAt
          ? Date.parse(result.macMetrics.recordedAt)
          : Date.now()
        if (!loadHistory && typeof cpu === 'number' && Number.isFinite(cpu)) {
          setCpuSamples(prev => {
            const next = [...prev, { at: Number.isFinite(at) ? at : Date.now(), value: cpu }]
            return next.slice(-MAX_CPU_SAMPLES)
          })
        }
      } catch {
        if (active) setError(true)
      }
    }
    void refresh()
    const interval = setInterval(() => void refresh(), 60_000)
    return () => { active = false; clearInterval(interval) }
  }, [loadStatus])

  useEffect(() => {
    if (!loadHistory) return
    let active = true
    const refresh = async () => {
      try {
        const samples = await loadHistory()
        if (active) {
          setCpuSamples(samples.map(item => ({ at: Date.parse(item.at), value: item.cpuPercent })))
          setHistoryError(false)
        }
      } catch {
        if (active) setHistoryError(true)
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 60_000)
    return () => { active = false; clearInterval(timer) }
  }, [loadHistory])

  const loading = Boolean(loadStatus) && !status && !error
  const tone = error ? 'error'
    : loading ? 'loading'
    : status?.status === 'online' ? 'online'
    : status?.status === 'offline' ? 'offline' : 'unknown'
  const label = error ? '연결 불가'
    : loading ? '상태 확인 중…'
    : !loadStatus ? 'Mushi Shell에서 상태를 확인할 수 있습니다.'
    : status?.status === 'online' ? '온라인'
    : status?.status === 'offline' ? '오프라인' : '확인되지 않음'
  const metrics = status?.macMetrics
  const estimatedMemoryUsed = metrics ? metrics.memoryTotalBytes - (metrics.memoryAvailableBytes ?? (metrics.memoryTotalBytes - metrics.memoryUsedBytes)) : 0
  const stale = metrics ? isMetricsStale(metrics.recordedAt, status?.status ?? 'unknown', error) : true
  const bridge = status?.bridge
  const bridgeStale = bridge ? isMetricsStale(bridge.checkedAt, status?.status ?? 'unknown', error) : true
  const bridgeLabel = !bridge ? '미확인'
    : bridgeStale ? (bridge.reachable ? '이전 연결' : '이전 끊김')
    : bridge.reachable ? '연결됨' : '끊김'

  return (
    <section aria-label="Mac Monitor" className="relative mx-auto grid w-full max-w-6xl gap-5">
      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-5 backdrop-blur-sm sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--brand-violet) 45%, transparent), transparent 70%)' }}
          />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                <MonitorCheckIcon size={18} className="text-primary" />
                Command Center
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Mac Monitor</h2>
              <div className="flex flex-wrap items-center gap-3">
                {loading ? (
                  <p role="status" className="inline-flex items-center gap-2 text-sm">
                    <LoaderCircleIcon size={18} />
                    <AppShinyText>{label}</AppShinyText>
                  </p>
                ) : (
                  <>
                    <p role="status" className="sr-only">{label}</p>
                    <StatusChip tone={tone} label={label} />
                  </>
                )}
                {status?.lastSeenAt && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ClockIcon size={15} className="text-primary" />
                    <span className="font-mono tabular-nums">{new Date(status.lastSeenAt).toLocaleString('ko-KR')}</span>
                  </p>
                )}
                {stale && metrics && (
                  <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs text-warning-foreground">실시간 아님</span>
                )}
              </div>
            </div>

            <div
              aria-label="Onion Bridge 상태"
              className="flex min-w-[14rem] items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <RadioTowerIcon size={18} className="text-chart-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Onion Bridge</p>
                  <p className="text-sm font-medium text-foreground">{bridgeLabel}</p>
                </div>
              </div>
              <StatusChip
                tone={!bridge ? 'unknown' : bridgeStale ? 'unknown' : bridge.reachable ? 'online' : 'offline'}
                label={bridge ? (bridge.reachable && !bridgeStale ? 'OK' : '대기') : '없음'}
              />
            </div>
          </div>
        </header>
      </AppBlurFade>

      {error && (
        <AppBlurFade delay={0.04} direction="up" inView>
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Monitor API 연결을 확인해 주세요. 이전 정보는 최신 상태가 아닙니다.
          </p>
        </AppBlurFade>
      )}

      <div className="relative grid gap-4 lg:grid-cols-12">
        {metrics ? (
          <>
            <AppBlurFade delay={0.06} direction="up" className="lg:col-span-8" inView>
              <AppMagicCard className="rounded-2xl">
                <div className="relative grid gap-4 p-5 sm:p-6">
                  <AppBorderBeam size={100} duration={12} borderWidth={1.25} />
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CpuIcon size={20} className="text-primary" />
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">CPU</h3>
                        <p className="text-xs text-muted-foreground">{metrics.cpuCores}코어</p>
                      </div>
                    </div>
                    <p className="font-mono text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                      <AppNumberTicker value={metrics.cpuPercent} decimalPlaces={1} />
                      <span className="ml-1 text-lg text-muted-foreground">%</span>
                    </p>
                  </div>
                  <CpuAreaChart samples={cpuSamples} value={metrics.cpuPercent} />
                  {loadHistory && <p className="text-xs text-muted-foreground">{historyError ? '이력 조회 불가 · 현재 스냅샷만 표시' : cpuSamples.length > 0 ? `저장된 실측 데이터 ${cpuSamples.length}개 · 최근 24시간` : '저장된 이력 없음'}</p>}
                </div>
              </AppMagicCard>
            </AppBlurFade>

            <div className="grid gap-4 lg:col-span-4">
              <AppBlurFade delay={0.1} direction="up" inView>
                <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HardDriveDownloadIcon size={18} className="text-chart-2" />
                    메모리
                  </div>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                    <AppNumberTicker value={Number(gib(estimatedMemoryUsed))} decimalPlaces={1} />
                    <span className="text-sm font-normal text-muted-foreground"> / {gib(metrics.memoryTotalBytes)} GiB</span>
                  </p>
                  <SegmentedBar
                    label="추정 사용량"
                    usedLabel={`${ratio(estimatedMemoryUsed, metrics.memoryTotalBytes).toFixed(0)}%`}
                    percent={ratio(estimatedMemoryUsed, metrics.memoryTotalBytes)}
                  />
                  <p className="text-xs text-muted-foreground">{metrics.memoryAvailableBytes === undefined ? '기존 수집값 · 캐시 포함' : '캐시 회수 가능량 반영 추정치'} · Swap {metrics.swapUsedBytes === undefined ? '확인 불가' : gib(metrics.swapUsedBytes) + ' GiB'}</p>
                  <p className="text-xs text-muted-foreground">정확한 메모리 압력은 macOS 활성 상태 보기에서 확인</p>
                </div>
              </AppBlurFade>

              <AppBlurFade delay={0.14} direction="up" inView>
                <div className="grid gap-3 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ServerIcon size={18} className="text-chart-5" />
                      디스크
                    </div>
                    <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {ratio(metrics.diskUsedBytes, metrics.diskTotalBytes).toFixed(0)}%
                    </p>
                  </div>
                  <MetricBar
                    label="디스크"
                    valueLabel={`${gib(metrics.diskUsedBytes)} / ${gib(metrics.diskTotalBytes)} GiB`}
                    percent={ratio(metrics.diskUsedBytes, metrics.diskTotalBytes)}
                    tone={5}
                  />
                </div>
              </AppBlurFade>
            </div>

            <AppBlurFade delay={0.18} direction="up" className="lg:col-span-12" inView>
              <div aria-label="Mac 수집 지표" className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3 sm:p-5">
                <div className="grid gap-1 rounded-xl bg-muted/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <ClockIcon size={15} className="text-primary" />
                    가동 시간
                  </p>
                  <p className="font-mono text-base tabular-nums text-foreground">{uptimeLabel(metrics.uptimeSeconds)}</p>
                </div>
                <div className="grid gap-1 rounded-xl bg-muted/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <BoxesIcon size={15} className="text-chart-2" />
                    프로세스
                  </p>
                  <p className="font-mono text-base tabular-nums text-foreground">
                    <AppNumberTicker value={metrics.processCount} />
                    <span className="text-muted-foreground">개</span>
                  </p>
                </div>
                <div className="grid gap-1 rounded-xl bg-muted/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">마지막 수집</p>
                  <p className="font-mono text-sm tabular-nums text-foreground">{new Date(metrics.recordedAt).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            </AppBlurFade>
          </>
        ) : (
          <AppBlurFade delay={0.08} direction="up" className="lg:col-span-12" inView>
            <div aria-label="Mac 수집 지표" className="grid gap-3 rounded-2xl border border-dashed border-border bg-card/70 p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ServerIcon size={20} className="text-primary" />
                <h3 className="text-sm font-medium text-foreground">지표 대기</h3>
              </div>
              <p role="status" className="text-sm text-muted-foreground">
                {!loadStatus ? 'Mushi Shell에서 상태를 확인할 수 있습니다.' : loading ? '지표를 불러오는 중…' : '아직 수집된 지표가 없습니다.'}
              </p>
            </div>
          </AppBlurFade>
        )}
      </div>
    </section>
  )
}
