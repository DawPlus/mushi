import { useQuery } from '@tanstack/react-query'
import { Coins, LineChart, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AppAuroraText,
  AppHyperText,
  AppShinyText,
  AppSparklesText,
} from '../../components/common'
import { cn } from '../../lib/utils'
import {
  fetchCustomsFx,
  fetchKospi,
  type OfficialCustomsFxDto,
  type OfficialKospiDto,
} from './public-data'

interface FinanceStripProps {
  className?: string
  /** When true, omit outer grid (parent owns layout). */
  embedded?: boolean
}

function MetricShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-3.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FinanceStrip({ className, embedded = false }: FinanceStripProps) {
  const fxQuery = useQuery<OfficialCustomsFxDto>({
    queryKey: ['dashboard', 'finance', 'fx', 'usd'],
    queryFn: () => fetchCustomsFx(),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })

  const kospiQuery = useQuery<OfficialKospiDto>({
    queryKey: ['dashboard', 'finance', 'kospi'],
    queryFn: () => fetchKospi(),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })

  const fx = fxQuery.data
  const kospi = kospiQuery.data
  const fxPending = fxQuery.isPending
  const kospiPending = kospiQuery.isPending
  const hasFxError = fxQuery.isError || (!fxPending && !fx)
  const hasKospiError = kospiQuery.isError || (!kospiPending && !kospi)

  const cells = (
    <>
      <MetricShell>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
            <AppHyperText as="span" className="text-[11px] tracking-wide" duration={750}>
              원/달러 · 관세환율
            </AppHyperText>
          </p>
          <Coins size={14} className="text-primary" aria-hidden="true" />
        </div>
        {fxPending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw size={12} className="animate-spin text-primary" aria-hidden="true" />
            불러오는 중…
          </div>
        ) : hasFxError || !fx ? (
          <p className="text-sm text-muted-foreground">확인 불가</p>
        ) : (
          <div className="grid gap-1">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              <AppAuroraText className="text-2xl font-semibold tracking-tight">
                {fx.rateFormatted}
              </AppAuroraText>
              <span className="ml-1 text-sm font-medium text-muted-foreground">원</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              <AppShinyText>
                적용 {fx.applyBeginDate} · 수입 주간
              </AppShinyText>
            </p>
          </div>
        )}
      </MetricShell>

      <MetricShell>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
            <AppHyperText as="span" className="text-[11px] tracking-wide" duration={750} delay={100}>
              코스피
            </AppHyperText>
          </p>
          <LineChart size={14} className="text-primary" aria-hidden="true" />
        </div>
        {kospiPending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw size={12} className="animate-spin text-primary" aria-hidden="true" />
            불러오는 중…
          </div>
        ) : hasKospiError || !kospi ? (
          <p className="text-sm text-muted-foreground">확인 불가</p>
        ) : (
          <div className="grid gap-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                <AppSparklesText className="text-2xl font-semibold" sparklesCount={6}>
                  {kospi.closingPriceFormatted}
                </AppSparklesText>
              </p>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold',
                  kospi.fluctuationRate > 0
                    ? 'text-rose-500 dark:text-rose-400'
                    : kospi.fluctuationRate < 0
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-muted-foreground',
                )}
              >
                {kospi.fluctuationRate > 0 && <TrendingUp size={12} aria-hidden="true" />}
                {kospi.fluctuationRate < 0 && <TrendingDown size={12} aria-hidden="true" />}
                {kospi.fluctuationRateFormatted}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <AppShinyText>
                기준 {kospi.baseDate} · 종가
              </AppShinyText>
            </p>
          </div>
        )}
      </MetricShell>
    </>
  )

  if (embedded) {
    return <>{cells}</>
  }

  return (
    <div aria-label="금융 요약" className={cn('grid gap-2.5 sm:grid-cols-2', className)}>
      {cells}
    </div>
  )
}
