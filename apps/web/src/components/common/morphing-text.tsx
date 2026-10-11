import { useReducedMotion } from 'motion/react'
import { MorphingText } from '../ui/morphing-text'
import { cn } from '../../lib/utils'

type AppMorphingTextProps = {
  texts: string[]
  className?: string
}

export function AppMorphingText({ texts, className }: AppMorphingTextProps) {
  const reduce = useReducedMotion()
  if (reduce || texts.length === 0) {
    return (
      <span className={cn('inline-block text-center font-semibold', className)}>
        {texts[0] ?? ''}
      </span>
    )
  }
  return (
    <MorphingText
      texts={texts}
      className={cn(
        'mx-0 h-auto max-w-none text-left text-[1.35rem] leading-tight font-semibold md:h-auto md:text-[1.75rem] lg:text-[1.75rem]',
        className,
      )}
    />
  )
}
