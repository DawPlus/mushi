import { useReducedMotion } from 'motion/react'
import { NumberTicker as NumberTickerPrimitive } from '../ui/number-ticker'
import { cn } from '../../lib/utils'

type AppNumberTickerProps = {
  value: number
  decimalPlaces?: number
  className?: string
  suffix?: string
}

export function AppNumberTicker({ value, decimalPlaces = 0, className, suffix }: AppNumberTickerProps) {
  const reduce = useReducedMotion()
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })

  if (reduce) {
    return (
      <span className={cn('inline-block font-mono tabular-nums tracking-wider text-foreground', className)}>
        {formatted}{suffix}
      </span>
    )
  }

  return (
    <span className="inline-flex items-baseline gap-1">
      <NumberTickerPrimitive
        value={value}
        decimalPlaces={decimalPlaces}
        className={cn('font-mono tabular-nums tracking-wider text-foreground', className)}
      />
      {suffix ? <span className={cn('font-mono text-muted-foreground', className)}>{suffix}</span> : null}
    </span>
  )
}
