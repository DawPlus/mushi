import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { IconCloud } from '../ui/icon-cloud'
import { cn } from '../../lib/utils'

type AppIconCloudProps = {
  icons?: ReactNode[]
  images?: string[]
  className?: string
  showControl?: boolean
}

export function AppIconCloud({
  icons,
  images,
  className,
  showControl = true,
}: AppIconCloudProps) {
  const reduce = useReducedMotion()

  return (
    <div className={cn('relative flex size-full items-center justify-center overflow-hidden', className)}>
      <IconCloud
        icons={icons}
        images={images}
        showControl={reduce ? true : showControl}
      />
    </div>
  )
}
