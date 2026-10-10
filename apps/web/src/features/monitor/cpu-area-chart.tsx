type Sample = { at: number; value: number }

type CpuAreaChartProps = {
  samples: Sample[]
  /** current value 0–100 for empty/single-point fill */
  value: number
  className?: string
}

/** SVG area from real poll samples only. Never invents series points. */
export function CpuAreaChart({ samples, value, className }: CpuAreaChartProps) {
  const width = 640
  const height = 180
  const padX = 8
  const padY = 12
  const points = samples.length > 0
    ? samples
    : [{ at: Date.now(), value }]

  const values = points.map(p => p.value)
  const minV = 0
  const maxV = 100
  const minT = points[0]?.at ?? 0
  const maxT = points[points.length - 1]?.at ?? minT + 1
  const spanT = Math.max(maxT - minT, 1)

  const coords = points.map((p, i) => {
    const x = points.length === 1
      ? padX + (width - padX * 2) * (i === 0 ? 0 : 1)
      : padX + ((p.at - minT) / spanT) * (width - padX * 2)
    const y = padY + (1 - (Math.min(maxV, Math.max(minV, p.value)) - minV) / (maxV - minV)) * (height - padY * 2)
    return { x, y }
  })

  // Single sample: draw a gentle plateau using the real value only (two identical y).
  if (coords.length === 1) {
    coords.push({ x: width - padX, y: coords[0].y })
  }

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${coords[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`
  const latest = values[values.length - 1] ?? value

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible sm:h-52"
        role="img"
        aria-label={`CPU ${latest.toFixed(1)} percent`}
      >
        <defs>
          <linearGradient id="cpu-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-skymint)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--brand-skymint)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cpu-area-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand-skymint)" />
            <stop offset="100%" stopColor="var(--brand-violet)" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map(level => {
          const y = padY + (1 - level / 100) * (height - padY * 2)
          return (
            <line
              key={level}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          )
        })}
        <path d={area} fill="url(#cpu-area-fill)" />
        <path d={line} fill="none" stroke="url(#cpu-area-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4.5"
            fill="var(--brand-skymint)"
            stroke="var(--brand-midnight)"
            strokeWidth="2"
          />
        )}
      </svg>
      {samples.length < 2 && (
        <p className="mt-1 text-xs text-muted-foreground">폴링이 쌓이면 실측 추세가 이어집니다.</p>
      )}
    </div>
  )
}
