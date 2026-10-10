import type { CSSProperties, ReactNode } from 'react'

type StarBorderProps = {
  children: ReactNode
  className?: string
  color?: string
  speed?: string
  thickness?: number
  active?: boolean
}

/**
 * React Bits StarBorder–style orbiting glow around a card.
 * When `active` is false, renders children without the effect.
 */
export function StarBorder({
  children,
  className = '',
  color = '#34c77a',
  speed = '4s',
  thickness = 2,
  active = true,
}: StarBorderProps) {
  if (!active) {
    return <>{children}</>
  }

  return (
    <div
      className={`ob-star-border ${className}`.trim()}
      style={
        {
          '--ob-star-color': color,
          '--ob-star-speed': speed,
          padding: `${thickness}px`,
        } as CSSProperties
      }
    >
      <span className="ob-star-border-glow is-bottom" aria-hidden="true" />
      <span className="ob-star-border-glow is-top" aria-hidden="true" />
      <div className="ob-star-border-inner">{children}</div>
    </div>
  )
}
