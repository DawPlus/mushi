import { useEffect, useState } from 'react'
import { AnimatedThemeToggler } from '../ui/animated-theme-toggler'
import {
  bootstrapTheme,
  type ThemeMode,
  writeStoredTheme,
} from '../../lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    setMode(bootstrapTheme())
  }, [])

  return (
    <AnimatedThemeToggler
      theme={mode}
      onThemeChange={next => {
        writeStoredTheme(next)
        setMode(next)
      }}
      variant="circle"
      duration={450}
      className={className ?? 'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground transition-all hover:bg-muted active:scale-[0.98]'}
      aria-label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={mode === 'dark' ? '라이트 모드' : '다크 모드'}
    />
  )
}
