type SegmentedBarProps = {
  label: string
  usedLabel: string
  percent: number
  segments?: number
}

export function SegmentedBar({ label, usedLabel, percent, segments = 24 }: SegmentedBarProps) {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * segments)
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums text-foreground">{usedLabel}</span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={usedLabel}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 rounded-sm ${i < filled ? 'bg-chart-2' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}
