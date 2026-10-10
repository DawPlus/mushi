import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type DecryptedTextProps = {
  text: string
  className?: string
  encryptedClassName?: string
  speed?: number
  maxIterations?: number
  animateOn?: 'view' | 'hover'
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%'

/** React Bits DecryptedText — scramble-to-reveal (simplified). */
export function DecryptedText({
  text,
  className = '',
  encryptedClassName = 'ob-decrypt-noise',
  speed = 32,
  maxIterations = 8,
  animateOn = 'view',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [done, setDone] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chars = useMemo(() => CHARS.split(''), [])

  const shuffle = useCallback(
    (original: string, current: Set<number>) =>
      original
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          if (current.has(i)) return original[i]
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join(''),
    [chars],
  )

  const trigger = useCallback(() => {
    setRevealed(new Set())
    setDone(false)
    setIsAnimating(true)
  }, [])

  useEffect(() => {
    if (!isAnimating) return
    let iteration = 0
    intervalRef.current = setInterval(() => {
      setRevealed((prev) => {
        if (prev.size < text.length) {
          const next = new Set(prev)
          next.add(prev.size)
          setDisplayText(shuffle(text, next))
          return next
        }
        clearInterval(intervalRef.current ?? undefined)
        setIsAnimating(false)
        setDone(true)
        setDisplayText(text)
        return prev
      })
      iteration += 1
      if (iteration > text.length + maxIterations) {
        clearInterval(intervalRef.current ?? undefined)
        setIsAnimating(false)
        setDone(true)
        setDisplayText(text)
      }
    }, speed)
    return () => clearInterval(intervalRef.current ?? undefined)
  }, [isAnimating, text, speed, maxIterations, shuffle])

  useEffect(() => {
    if (animateOn !== 'view') return
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAnimated) {
            trigger()
            setHasAnimated(true)
          }
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [animateOn, hasAnimated, trigger])

  useEffect(() => {
    setDisplayText(text)
    setDone(true)
    setRevealed(new Set())
    setHasAnimated(false)
  }, [text])

  return (
    <span
      ref={containerRef}
      className={`ob-decrypt ${className}`.trim()}
      onMouseEnter={animateOn === 'hover' ? trigger : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {displayText.split('').map((char, index) => {
          const clear = revealed.has(index) || (!isAnimating && done)
          return (
            <span key={`${index}-${char}`} className={clear ? undefined : encryptedClassName}>
              {char}
            </span>
          )
        })}
      </span>
    </span>
  )
}
