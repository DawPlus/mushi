import { useEffect, useState } from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

interface WordRotateProps {
  words: string[]
  duration?: number
  motionProps?: MotionProps
  className?: string
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div"
}

export function WordRotate({
  words,
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
  as = "span",
}: WordRotateProps) {
  const [index, setIndex] = useState(0)
  const MotionTag = motion[as]

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, duration)

    // Clean up interval on unmount
    return () => clearInterval(interval)
  }, [words, duration])

  return (
    <div className="inline-flex overflow-hidden align-baseline">
      <AnimatePresence mode="wait">
        <MotionTag
          key={words[index]}
          className={cn(className)}
          {...motionProps}
        >
          {words[index]}
        </MotionTag>
      </AnimatePresence>
    </div>
  )
}
