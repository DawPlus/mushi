import type { ComponentProps } from 'react'
import { useReducedMotion } from 'motion/react'
import { BorderBeam as BorderBeamPrimitive } from '../ui/border-beam'

type AppBorderBeamProps = ComponentProps<typeof BorderBeamPrimitive>

export function AppBorderBeam({
  colorFrom = 'var(--brand-skymint)',
  colorTo = 'var(--chart-2)',
  ...props
}: AppBorderBeamProps) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return <BorderBeamPrimitive colorFrom={colorFrom} colorTo={colorTo} {...props} />
}
