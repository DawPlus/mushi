import type { ComponentProps } from 'react'
import { MagicCard as MagicCardPrimitive } from '../ui/magic-card'

export function AppMagicCard(props: ComponentProps<typeof MagicCardPrimitive>) {
  return <MagicCardPrimitive {...props} />
}
