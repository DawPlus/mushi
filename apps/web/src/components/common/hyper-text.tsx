import { useReducedMotion } from 'motion/react'
import { HyperText } from '../ui/hyper-text'
import { cn } from '../../lib/utils'

type AppHyperTextProps = {
  children: string
  className?: string
  duration?: number
  delay?: number
  as?: 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4'
  startOnView?: boolean
  animateOnHover?: boolean
}

export function AppHyperText({
  children,
  className,
  duration = 800,
  delay = 0,
  as = 'span',
  startOnView = true,
  animateOnHover = true,
}: AppHyperTextProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Tag = as
    return <Tag className={cn(className)}>{children}</Tag>
  }
  return (
    <HyperText
      as={as}
      className={cn('py-0 text-inherit font-inherit', className)}
      duration={duration}
      delay={delay}
      startOnView={startOnView}
      animateOnHover={animateOnHover}
    >
      {children}
    </HyperText>
  )
}
