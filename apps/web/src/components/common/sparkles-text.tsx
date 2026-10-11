import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { SparklesText } from '../ui/sparkles-text'
import { cn } from '../../lib/utils'

type AppSparklesTextProps = {
  children: ReactNode
  className?: string
  sparklesCount?: number
}

const BRAND_SPARKLE_COLORS = {
  first: 'var(--brand-violet)',
  second: 'var(--brand-skymint)',
} as const

export function AppSparklesText({
  children,
  className,
  sparklesCount = 8,
}: AppSparklesTextProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <span className={cn(className)}>{children}</span>
  }
  return (
    <SparklesText
      className={cn('text-inherit font-inherit', className)}
      sparklesCount={sparklesCount}
      colors={BRAND_SPARKLE_COLORS}
    >
      {children}
    </SparklesText>
  )
}
