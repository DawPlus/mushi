import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { AnimatedShinyText } from '../ui/animated-shiny-text'
import { cn } from '../../lib/utils'

export function AppShinyText({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <span className={cn('text-muted-foreground', className)}>{children}</span>
  }
  return (
    <AnimatedShinyText
      className={cn(
        'mx-0 max-w-none text-muted-foreground dark:text-muted-foreground',
        className,
      )}
    >
      {children}
    </AnimatedShinyText>
  )
}
