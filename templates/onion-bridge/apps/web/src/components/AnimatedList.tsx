import {
  useRef,
  type ReactNode,
  type MouseEventHandler,
} from 'react'
import { motion, useInView, AnimatePresence } from 'motion/react'

type AnimatedItemProps = {
  children: ReactNode
  delay?: number
  index: number
  className?: string
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onClick?: MouseEventHandler<HTMLDivElement>
}

/** React Bits AnimatedList–style item: scale+fade in when scrolled into view. */
export function AnimatedItem({
  children,
  delay = 0,
  index,
  className = '',
  onMouseEnter,
  onClick,
}: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.2, once: true })

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.92, opacity: 0, y: 12 }}
      animate={
        inView
          ? { scale: 1, opacity: 1, y: 0 }
          : { scale: 0.92, opacity: 0, y: 12 }
      }
      exit={{ scale: 0.96, opacity: 0, y: -8 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type AnimatedListProps = {
  children: ReactNode
  className?: string
}

/** Wrapper that enables exit animations for list children. */
export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </div>
  )
}
