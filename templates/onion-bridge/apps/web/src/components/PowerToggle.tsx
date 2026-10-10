import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionStyle,
} from 'motion/react'

type PowerToggleProps = {
  on: boolean
  busy?: boolean
  disabled?: boolean
  offLabel?: string
  onLabel?: string
  onChange?: (next: boolean) => void
  className?: string
  size?: 'sm' | 'md'
}

const SPRING_UI = { type: 'spring' as const, duration: 0.32, bounce: 0.15 }
const SEG_EASE = 'cubic-bezier(0.77, 0, 0.175, 1)'
const WARP = 0.6

function passOffset(k: number, passes: number) {
  return 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), WARP)
}

function ringKeyframes(from: number, amplitude: number, passes: number, decay: number): Keyframe[] {
  const frames: Keyframe[] = [
    { transform: `rotate(${from}deg)`, offset: 0, easing: SEG_EASE },
  ]
  for (let k = 0; k < passes; k++) {
    const angle = amplitude * Math.pow(1 - k / passes, decay) * (k % 2 ? 1 : -1)
    frames.push({
      transform: `rotate(${angle.toFixed(2)}deg)`,
      offset: passOffset(k, passes),
      easing: SEG_EASE,
    })
  }
  frames.push({ transform: 'rotate(0deg)', offset: 1 })
  return frames
}

function liveAngle(el: Element) {
  const tf = getComputedStyle(el).transform
  if (!tf || tf === 'none') return 0
  const m = new DOMMatrix(tf)
  return (Math.atan2(m.b, m.a) * 180) / Math.PI
}

/**
 * React Bits BellToggle–inspired power switch for bridge on/off.
 * Rings the glyph and crossfades labels when turning on.
 */
export function PowerToggle({
  on,
  busy = false,
  disabled = false,
  offLabel = 'OFF',
  onLabel = 'ON',
  onChange,
  className = '',
  size = 'md',
}: PowerToggleProps) {
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLSpanElement>(null)
  const glyphRef = useRef<HTMLSpanElement>(null)
  const waveLeft = useRef<SVGSVGElement>(null)
  const waveRight = useRef<SVGSVGElement>(null)
  const offRef = useRef<HTMLSpanElement>(null)
  const onRef = useRef<HTMLSpanElement>(null)
  const lastInput = useRef<'pointer' | 'keyboard'>('pointer')
  const pending = useRef<'pointer' | 'keyboard' | null>(null)
  const spring = useRef<AnimationPlaybackControls | null>(null)
  const [pressedUi, setPressedUi] = useState(false)

  const t = useMotionValue(on ? 1 : 0)
  const wOff = useMotionValue(0)
  const wOn = useMotionValue(0)
  const clip = useTransform(
    [t, wOff, wOn],
    ([v, a, b]: number[]) => `${Math.max(a, b) - (a + (b - a) * v)}px`,
  )

  const dims =
    size === 'sm'
      ? { h: 34, fs: 11, icon: 15, px: 12, gap: 7 }
      : { h: 40, fs: 12, icon: 17, px: 14, gap: 8 }

  useLayoutEffect(() => {
    const measure = () => {
      if (offRef.current) wOff.set(offRef.current.offsetWidth)
      if (onRef.current) wOn.set(onRef.current.offsetWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (offRef.current) observer.observe(offRef.current)
    if (onRef.current) observer.observe(onRef.current)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [offLabel, onLabel, size, wOff, wOn])

  const swing = (amplitude: number, passes: number, duration: number) => {
    const el = glyphRef.current
    if (!el) return
    el.getAnimations().forEach((a) => a.cancel())
    el.animate(ringKeyframes(liveAngle(el), amplitude, passes, 1), {
      duration,
      easing: 'linear',
    })
    for (let k = 0; k < passes; k++) {
      const side = k % 2 ? waveRight.current : waveLeft.current
      if (!side) continue
      const strength = Math.pow(1 - k / passes, 1)
      side.animate(
        [
          { opacity: 0, transform: 'scale(0.55)' },
          { opacity: 0.9 * strength, offset: 0.3 },
          { opacity: 0, transform: 'scale(1.25)' },
        ],
        {
          duration: 360,
          delay: passOffset(k, passes) * duration,
          easing: 'ease-out',
        },
      )
    }
  }

  useLayoutEffect(() => {
    const pointer = pending.current === 'pointer' && !reduce
    pending.current = null
    spring.current?.stop()
    if (pointer) spring.current = animate(t, on ? 1 : 0, SPRING_UI)
    else t.jump(on ? 1 : 0)
    if (on && pointer) swing(16, 5, 780)
  }, [on, reduce, t])

  useLayoutEffect(() => () => spring.current?.stop(), [])

  const locked = disabled || busy

  const toggle = () => {
    if (locked) return
    pending.current = lastInput.current
    onChange?.(!on)
  }

  return (
    <motion.span
      ref={rootRef}
      className={`ob-power-toggle ${on ? 'is-on' : ''} ${busy ? 'is-busy' : ''} ${className}`.trim()}
      data-on={on ? 'true' : 'false'}
      data-pressed={pressedUi ? '' : undefined}
      data-disabled={locked ? '' : undefined}
      style={
        {
          '--pt-clip': clip,
          '--pt-h': `${dims.h}px`,
          '--pt-fs': `${dims.fs}px`,
          '--pt-icon': `${dims.icon}px`,
          '--pt-px': `${dims.px}px`,
          '--pt-gap': `${dims.gap}px`,
        } as MotionStyle & CSSProperties
      }
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="ob-power-toggle-btn"
        aria-pressed={on}
        aria-label={on ? onLabel : offLabel}
        disabled={locked}
        onPointerDown={(event) => {
          lastInput.current = 'pointer'
          if (event.button === 0 && !locked) setPressedUi(true)
        }}
        onPointerUp={() => setPressedUi(false)}
        onPointerCancel={() => setPressedUi(false)}
        onPointerLeave={() => setPressedUi(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            lastInput.current = 'keyboard'
          }
        }}
        onClick={toggle}
      >
        <span className="ob-power-glyph" aria-hidden="true">
          <span ref={glyphRef} className="ob-power-glyph-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3v9" strokeLinecap="round" />
              <path
                d="M7.5 7.2a7 7 0 1 0 9 0"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <svg
            ref={waveLeft}
            className="ob-power-wave is-left"
            viewBox="0 0 14 14"
          >
            <path d="M14 8a6 6 0 0 0-6 6" />
            <path d="M14 4A10 10 0 0 0 4 14" />
          </svg>
          <svg
            ref={waveRight}
            className="ob-power-wave is-right"
            viewBox="0 0 14 14"
          >
            <path d="M0 8a6 6 0 0 1 6 6" />
            <path d="M0 4a10 10 0 0 1 10 10" />
          </svg>
        </span>
        <span className="ob-power-labels" aria-hidden="true">
          <span ref={offRef} className="ob-power-label is-off">
            {offLabel}
          </span>
          <span ref={onRef} className="ob-power-label is-on">
            {onLabel}
          </span>
        </span>
      </button>
    </motion.span>
  )
}
