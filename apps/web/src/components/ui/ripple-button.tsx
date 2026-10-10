import React, { useEffect, useState, type MouseEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string
  duration?: string
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = 'color-mix(in oklab, var(--brand-skymint) 65%, white)',
      duration = '600ms',
      onClick,
      ...props
    },
    ref,
  ) => {
    const reduce = useReducedMotion()
    const [buttonRipples, setButtonRipples] = useState<
      Array<{ x: number; y: number; size: number; key: number }>
    >([])

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (!reduce) createRipple(event)
      onClick?.(event)
    }

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2
      const newRipple = { x, y, size, key: Date.now() }
      setButtonRipples(prevRipples => [...prevRipples, newRipple])
    }

    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout> | null = null
      if (buttonRipples.length > 0) {
        const lastRipple = buttonRipples[buttonRipples.length - 1]
        timeout = setTimeout(() => {
          setButtonRipples(prevRipples =>
            prevRipples.filter(ripple => ripple.key !== lastRipple.key),
          )
        }, parseInt(duration, 10))
      }
      return () => {
        if (timeout !== null) clearTimeout(timeout)
      }
    }, [buttonRipples, duration])

    return (
      <button
        className={cn(
          'relative inline-flex cursor-pointer items-center justify-center overflow-hidden',
          className,
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-[inherit]">
          {children}
        </span>
        <span className="pointer-events-none absolute inset-0">
          {buttonRipples.map(ripple => (
            <span
              className="animate-rippling absolute rounded-full opacity-30"
              key={ripple.key}
              style={
                {
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                  top: `${ripple.y}px`,
                  left: `${ripple.x}px`,
                  backgroundColor: rippleColor,
                  transform: 'scale(0)',
                  '--duration': duration,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      </button>
    )
  },
)

RippleButton.displayName = 'RippleButton'
