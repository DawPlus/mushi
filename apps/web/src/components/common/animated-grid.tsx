import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { FlickeringGrid } from '../ui/flickering-grid'
import { cn } from '../../lib/utils'

function useCssColor(variable: string, fallback: string) {
  const [value, setValue] = useState(fallback)
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
      setValue(raw || fallback)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [variable, fallback])
  return value
}

type AppAnimatedGridProps = {
  className?: string
  fullscreen?: boolean
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  maxOpacity?: number
}

/** Full-app backdrop using Magic UI Flickering Grid, tinted from brand tokens. */
export function AppAnimatedGrid({
  className,
  fullscreen = false,
  squareSize = 3,
  gridGap = 5,
  flickerChance = 0.12,
  maxOpacity = 0.16,
}: AppAnimatedGridProps) {
  const reduce = useReducedMotion()
  const color = useCssColor('--brand-skymint', 'rgb(184, 247, 228)')

  if (reduce) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none',
        fullscreen
          ? 'fixed inset-0 z-0 h-dvh w-screen'
          : 'absolute inset-0 h-full w-full',
        className,
      )}
    >
      <FlickeringGrid
        squareSize={squareSize}
        gridGap={gridGap}
        flickerChance={flickerChance}
        maxOpacity={maxOpacity}
        color={color}
        className="size-full mask-[radial-gradient(ellipse_at_center,white_30%,transparent_80%)]"
      />
    </div>
  )
}
