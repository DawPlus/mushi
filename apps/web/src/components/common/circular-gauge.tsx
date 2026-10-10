import { useReducedMotion } from 'motion/react'
import { AnimatedCircularProgressBar } from '../ui/animated-circular-progress-bar'
import { cn } from '../../lib/utils'

type Tone = 1 | 2 | 3 | 4 | 5

const toneVar: Record<Tone, string> = {
  1: 'var(--chart-1)',
  2: 'var(--chart-2)',
  3: 'var(--chart-3)',
  4: 'var(--chart-4)',
  5: 'var(--chart-5)',
}

type CircularGaugeProps = {
  value: number
  tone?: Tone
  className?: string
  label?: string
}

export function CircularGauge({ value, tone = 1, className, label }: CircularGaugeProps) {
  const reduce = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, value))

  if (reduce) {
    return (
      <div
        className={cn('relative grid size-28 place-items-center rounded-full border-4 border-muted font-mono text-xl font-semibold tabular-nums text-foreground', className)}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        style={{ borderColor: toneVar[tone] }}
      >
        {Math.round(clamped)}
      </div>
    )
  }

  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)}>
      <AnimatedCircularProgressBar
        value={clamped}
        gaugePrimaryColor={toneVar[tone]}
        gaugeSecondaryColor="color-mix(in oklab, var(--muted) 80%, transparent)"
        className={cn('size-28 text-lg font-mono tabular-nums text-foreground', className)}
      />
    </div>
  )
}
