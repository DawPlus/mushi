import { useCallback, useEffect, useMemo, useRef } from 'react'

type Dot = {
  cx: number
  cy: number
  xOffset: number
  yOffset: number
  vx: number
  vy: number
}

export type DotGridProps = {
  dotSize?: number
  gap?: number
  baseColor?: string
  activeColor?: string
  proximity?: number
  shockRadius?: number
  shockStrength?: number
  className?: string
  style?: React.CSSProperties
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return { r: 42, g: 47, b: 58 }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  }
}

/**
 * React Bits DotGrid–style interactive canvas (no GSAP / InertiaPlugin).
 * Proximity color + soft spring push on move/click.
 */
export function DotGrid({
  dotSize = 3,
  gap = 28,
  baseColor = '#2a2f3a',
  activeColor = '#f07a52',
  proximity = 140,
  shockRadius = 220,
  shockStrength = 4.5,
  className = '',
  style,
}: DotGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false })
  const reducedRef = useRef(false)

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor])

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const { width, height } = wrap.getBoundingClientRect()
    if (width < 2 || height < 2) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const cell = dotSize + gap
    const cols = Math.max(1, Math.floor((width + gap) / cell))
    const rows = Math.max(1, Math.floor((height + gap) / cell))
    const gridW = cell * cols - gap
    const gridH = cell * rows - gap
    const startX = (width - gridW) / 2 + dotSize / 2
    const startY = (height - gridH) / 2 + dotSize / 2

    const dots: Dot[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          vx: 0,
          vy: 0,
        })
      }
    }
    dotsRef.current = dots
  }, [dotSize, gap])

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    buildGrid()
    const ro = new ResizeObserver(buildGrid)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [buildGrid])

  useEffect(() => {
    let raf = 0
    const proxSq = proximity * proximity
    const spring = 18
    const damp = 0.86

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      ctx.clearRect(0, 0, width, height)

      const { x: px, y: py, inside } = pointerRef.current
      const dots = dotsRef.current

      for (const dot of dots) {
        if (!reducedRef.current) {
          dot.vx += -dot.xOffset * spring * 0.016
          dot.vy += -dot.yOffset * spring * 0.016
          dot.vx *= damp
          dot.vy *= damp
          dot.xOffset += dot.vx
          dot.yOffset += dot.vy
          if (Math.abs(dot.xOffset) < 0.02 && Math.abs(dot.vx) < 0.02) {
            dot.xOffset = 0
            dot.vx = 0
          }
          if (Math.abs(dot.yOffset) < 0.02 && Math.abs(dot.vy) < 0.02) {
            dot.yOffset = 0
            dot.vy = 0
          }
        }

        const ox = dot.cx + dot.xOffset
        const oy = dot.cy + dot.yOffset
        let fill = baseColor
        if (inside) {
          const dx = dot.cx - px
          const dy = dot.cy - py
          const dsq = dx * dx + dy * dy
          if (dsq <= proxSq) {
            const t = 1 - Math.sqrt(dsq) / proximity
            const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t)
            const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t)
            const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t)
            fill = `rgb(${r},${g},${b})`
          }
        }

        ctx.beginPath()
        ctx.fillStyle = fill
        ctx.arc(ox, oy, dotSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [proximity, baseColor, activeRgb, baseRgb, dotSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current.x = event.clientX - rect.left
      pointerRef.current.y = event.clientY - rect.top
      pointerRef.current.inside = true

      if (reducedRef.current) return
      const { x: px, y: py } = pointerRef.current
      for (const dot of dotsRef.current) {
        const dx = dot.cx - px
        const dy = dot.cy - py
        const dist = Math.hypot(dx, dy)
        if (dist < proximity && dist > 0.1) {
          const force = (1 - dist / proximity) * 0.55
          dot.vx += (dx / dist) * force
          dot.vy += (dy / dist) * force
        }
      }
    }

    const onLeave = () => {
      pointerRef.current.inside = false
    }

    const onClick = (event: PointerEvent) => {
      if (reducedRef.current) return
      const rect = canvas.getBoundingClientRect()
      const cx = event.clientX - rect.left
      const cy = event.clientY - rect.top
      for (const dot of dotsRef.current) {
        const dx = dot.cx - cx
        const dy = dot.cy - cy
        const dist = Math.hypot(dx, dy)
        if (dist < shockRadius && dist > 0.1) {
          const falloff = 1 - dist / shockRadius
          dot.vx += (dx / dist) * shockStrength * falloff * 2.2
          dot.vy += (dy / dist) * shockStrength * falloff * 2.2
        }
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onClick, { passive: true })
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onClick)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [proximity, shockRadius, shockStrength])

  return (
    <div
      className={`ob-dotgrid ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <div ref={wrapperRef} className="ob-dotgrid-inner">
        <canvas ref={canvasRef} className="ob-dotgrid-canvas" />
      </div>
    </div>
  )
}
