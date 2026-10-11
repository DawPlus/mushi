import { useRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** Minimal React Bits-inspired spotlight; no JS animation loop or extra dependency. */
export function SpotlightCard({ children, featured = false }: { children: ReactNode; featured?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current
    if (!element) return
    const bounds = element.getBoundingClientRect()
    element.style.setProperty('--spot-x', ((event.clientX - bounds.left) / bounds.width * 100) + '%')
    element.style.setProperty('--spot-y', ((event.clientY - bounds.top) / bounds.height * 100) + '%')
  }
  return <div
    ref={ref}
    onPointerMove={move}
    className={cn(
      'group relative h-full overflow-hidden border bg-card/90 transition-[border-color,box-shadow] duration-300',
      'rounded-2xl border-border/60 hover:border-primary/40 hover:shadow-[0_12px_30px_color-mix(in_oklab,var(--brand-violet)_13%,transparent)]',
      featured && 'news-featured-glow',
      featured && 'rounded-3xl border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_12px_38px_color-mix(in_oklab,var(--brand-violet)_13%,transparent)]',
    )}
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" style={{ background: 'radial-gradient(350px circle at var(--spot-x,50%) var(--spot-y,50%), color-mix(in oklab,var(--brand-skymint) 12%, transparent), transparent 70%)' }} />
    <div className={featured ? "news-glow-body h-full rounded-[calc(1.5rem-2px)]" : "relative h-full"}>{children}</div>
  </div>
}
