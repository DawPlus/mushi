import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

type MagicCardProps = {
  children?: ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
}

/** Pointer-follow glow card. Defaults use Midnight Command Center brand tokens. */
export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientColor = 'color-mix(in oklab, var(--brand-skymint) 18%, transparent)',
  gradientOpacity = 0.55,
  gradientFrom = 'var(--brand-skymint)',
  gradientTo = 'var(--brand-violet)',
}: MagicCardProps) {
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const [enabled, setEnabled] = useState(false)
  const borderBackground = useMotionTemplate`
    linear-gradient(var(--color-card) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      var(--color-border) 100%
    ) border-box
  `
  const glowBackground = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor},
      transparent 100%
    )
  `

  useEffect(() => {
    setEnabled(!reduce)
  }, [reduce])

  const reset = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [gradientSize, mouseX, mouseY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [enabled, mouseX, mouseY],
  )

  if (!enabled) {
    return <div className={cn('relative overflow-hidden rounded-[inherit]', className)}>{children}</div>
  }

  return (
    <motion.div
      className={cn('group relative isolate overflow-hidden rounded-[inherit]', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={{
        background: borderBackground,
        border: '1px solid transparent',
      }}
    >
      <div className="absolute inset-px z-20 rounded-[inherit] bg-card" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: glowBackground,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative z-40">{children}</div>
    </motion.div>
  )
}
