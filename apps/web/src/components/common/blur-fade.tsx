import type { ComponentProps } from 'react'
import { useReducedMotion } from 'motion/react'
import { BlurFade as BlurFadePrimitive } from '../ui/blur-fade'

type AppBlurFadeProps = ComponentProps<typeof BlurFadePrimitive>

export function AppBlurFade({ children, className, ...props }: AppBlurFadeProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return <BlurFadePrimitive className={className} {...props}>{children}</BlurFadePrimitive>
}
