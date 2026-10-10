import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ActivityIcon,
  AppAnimatedGrid,
  AppButton,
  LogoutIcon,
  PageEnter,
  ThemeToggle,
} from '../../components/common'
import { menuRegistry } from './menu-registry'
import { useOwnerAuth } from './owner-auth'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const current = menuRegistry.find(item => item.href === pathname && item.href !== '/')
  const onHome = pathname === '/'
  const ownerAuth = useOwnerAuth()

  return (
    <div className="relative min-h-dvh bg-background">
      <AppAnimatedGrid fullscreen />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand-violet)_14%,transparent),transparent_55%)]"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold text-foreground transition-opacity hover:opacity-80"
              aria-label="홈으로"
            >
              <ActivityIcon size={22} className="shrink-0 text-primary" />
              <span>Mushi</span>
            </Link>
            {!onHome && current && (
              <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                / {current.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {ownerAuth && (
              <AppButton
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="로그아웃"
                title="로그아웃"
                onClick={ownerAuth.signOut}
              >
                <LogoutIcon size={18} />
              </AppButton>
            )}
          </div>
        </div>
        <nav aria-label="주요 메뉴" className="relative z-10 border-t border-border/45 bg-background/35">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-5 md:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!onHome && <Link to="/" className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><ChevronLeft size={14} /> 홈</Link>}
            {menuRegistry.filter(item => item.ready).map(item => {
              const Icon = item.icon
              const active = item.href === pathname
              return <Link key={item.id} to={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'}`}><Icon size={15} aria-hidden="true" />{item.label}</Link>
            })}
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10">
        <PageEnter>{children}</PageEnter>
      </main>
    </div>
  )
}
