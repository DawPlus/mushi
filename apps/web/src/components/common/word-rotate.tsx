import { useReducedMotion } from 'motion/react'
import { WordRotate } from '../ui/word-rotate'
import { cn } from '../../lib/utils'

type AppWordRotateProps = {
  words: string[]
  className?: string
  duration?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
}

export function AppWordRotate({
  words,
  className,
  duration = 2500,
  as = 'span',
}: AppWordRotateProps) {
  const reduce = useReducedMotion()
  if (reduce || words.length === 0) {
    const Tag = as
    return <Tag className={cn(className)}>{words[0] ?? ''}</Tag>
  }
  return (
    <WordRotate
      words={words}
      duration={duration}
      as={as}
      className={cn('py-0 text-inherit font-inherit', className)}
      motionProps={{
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 12 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }}
    />
  )
}
