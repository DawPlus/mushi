import { useReducedMotion } from 'motion/react'
import { TypingAnimation } from '../ui/typing-animation'
import { cn } from '../../lib/utils'

type AppTypingAnimationProps = {
  children?: string
  words?: string[]
  className?: string
  typeSpeed?: number
  deleteSpeed?: number
  delay?: number
  pauseDelay?: number
  loop?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
  startOnView?: boolean
  showCursor?: boolean
}

export function AppTypingAnimation({
  children,
  words,
  className,
  typeSpeed = 70,
  deleteSpeed,
  delay = 0,
  pauseDelay,
  loop = false,
  as = 'span',
  startOnView = true,
  showCursor = true,
}: AppTypingAnimationProps) {
  const reduce = useReducedMotion()
  const text = children ?? words?.[0] ?? ''

  if (reduce) {
    const Tag = as
    return <Tag className={cn(className)}>{text}</Tag>
  }

  return (
    <TypingAnimation
      words={words}
      className={className}
      typeSpeed={typeSpeed}
      deleteSpeed={deleteSpeed}
      delay={delay}
      pauseDelay={pauseDelay}
      loop={loop}
      as={as}
      startOnView={startOnView}
      showCursor={showCursor}
    >
      {children}
    </TypingAnimation>
  )
}
