'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import { motion, useInView } from 'motion/react'
import { cn } from '../../lib/utils'

function AnimatedItem({
  children,
  index,
  onMouseEnter,
  onClick,
}: {
  children: ReactNode
  index: number
  onMouseEnter?: () => void
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4, once: true })
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.24) }}
      className="mb-1.5"
    >
      {children}
    </motion.div>
  )
}

export type ReactBitsAnimatedListProps<T> = {
  items: T[]
  getKey: (item: T, index: number) => string
  renderItem: (item: T, selected: boolean, index: number) => ReactNode
  onItemSelect?: (item: T, index: number) => void
  className?: string
  listClassName?: string
  showGradients?: boolean
  enableArrowNavigation?: boolean
  displayScrollbar?: boolean
  initialSelectedIndex?: number
}

export function ReactBitsAnimatedList<T>({
  items,
  getKey,
  renderItem,
  onItemSelect,
  className,
  listClassName,
  showGradients = true,
  enableArrowNavigation = true,
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: ReactBitsAnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex)
  const [keyboardNav, setKeyboardNav] = useState(false)
  const [topGradientOpacity, setTopGradientOpacity] = useState(0)
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1)

  const select = useCallback((item: T, index: number) => {
    setSelectedIndex(index)
    onItemSelect?.(item, index)
  }, [onItemSelect])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    setTopGradientOpacity(Math.min(scrollTop / 50, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1))
  }

  useEffect(() => {
    if (!enableArrowNavigation) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (event.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length) {
        event.preventDefault()
        select(items[selectedIndex] as T, selectedIndex)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enableArrowNavigation, items, select, selectedIndex])

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return
    const container = listRef.current
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null
    if (selectedItem) {
      const extraMargin = 40
      const top = selectedItem.offsetTop
      const bottom = top + selectedItem.offsetHeight
      if (top < container.scrollTop + extraMargin) {
        container.scrollTo({ top: top - extraMargin, behavior: 'smooth' })
      } else if (bottom > container.scrollTop + container.clientHeight - extraMargin) {
        container.scrollTo({
          top: bottom - container.clientHeight + extraMargin,
          behavior: 'smooth',
        })
      }
    }
    setKeyboardNav(false)
  }, [selectedIndex, keyboardNav])

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!enableArrowNavigation) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
      event.stopPropagation()
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={listRef}
        tabIndex={enableArrowNavigation ? 0 : undefined}
        role="listbox"
        aria-activedescendant={selectedIndex >= 0 ? `rb-animated-list-${selectedIndex}` : undefined}
        className={cn(
          'max-h-64 overflow-y-auto p-1.5',
          displayScrollbar
            ? '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border'
            : 'scrollbar-hide',
          listClassName,
        )}
        onScroll={handleScroll}
        onKeyDown={onListKeyDown}
        style={{
          scrollbarWidth: displayScrollbar ? 'thin' : 'none',
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={getKey(item, index)}
            index={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => select(item, index)}
          >
            <div id={`rb-animated-list-${index}`} role="option" aria-selected={selectedIndex === index}>
              {renderItem(item, selectedIndex === index, index)}
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-card to-transparent transition-opacity duration-300"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent transition-opacity duration-300"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  )
}
