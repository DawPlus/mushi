type MetricBarProps = {
  label: string
  valueLabel: string
  /** 0–100 */
  percent: number
  /** chart token index 1–5 */
  tone?: 1 | 2 | 3 | 4 | 5
}

const toneClass = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
} as const

export function MetricBar({ label, valueLabel, percent, tone = 1 }: MetricBarProps) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{valueLabel}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-valuetext={valueLabel}
      >
        <div className={`h-full rounded-full transition-[width] duration-300 ${toneClass[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
