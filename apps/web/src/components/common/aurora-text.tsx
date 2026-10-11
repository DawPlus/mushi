import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { AuroraText } from '../ui/aurora-text'
import { cn } from '../../lib/utils'

type AppAuroraTextProps = {
  children: ReactNode
  className?: string
  speed?: number
}

const BRAND_AURORA_COLORS = [
  'var(--brand-skymint)',
  'var(--brand-violet)',
  'var(--chart-2)',
  'var(--chart-4)',
]

export function AppAuroraText({ children, className, speed = 1 }: AppAuroraTextProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <span className={cn('text-primary', className)}>{children}</span>
  }
  return (
    <AuroraText className={cn(className)} colors={BRAND_AURORA_COLORS} speed={speed}>
      {children}
    </AuroraText>
  )
}
