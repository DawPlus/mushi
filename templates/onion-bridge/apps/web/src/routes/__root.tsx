import {
  Link,
  Outlet,
  createRootRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { ControlAuthGate } from '../components/ControlAuthGate'
import { DotGrid } from '../components/DotGrid'
import { ToastProvider } from '../components/Toast'
import {
  readStoredWorkspace,
  workspaceBasename,
  writeStoredWorkspace,
} from '../lib/activeWorkspace'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()
  const search = useRouterState({
    select: (state) => state.location.search as { workspace?: string },
  })
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const workspacePath =
    typeof search.workspace === 'string' ? search.workspace : null
  const stored = typeof window !== 'undefined' ? readStoredWorkspace() : null
  const workspaceLabel = workspacePath
    ? stored?.path === workspacePath
      ? stored.name
      : workspaceBasename(workspacePath)
    : null

  const onProjects = pathname === '/'

  function changeWorkspace() {
    writeStoredWorkspace(null)
    void navigate({
      to: '/',
      search: {},
    })
  }

  return (
    <ToastProvider>
      <div className="ob-shell">
        <div className="ob-bg" aria-hidden="true">
          <DotGrid
            baseColor="#2a2f3a"
            activeColor="#f07a52"
            dotSize={2.5}
            gap={30}
            proximity={150}
            shockRadius={240}
            shockStrength={5}
          />
        </div>

        <header className="ob-header">
          <div className="ob-header-inner">
            <div className="ob-brand">
              <div className="ob-mark" aria-hidden="true">
                🧅
              </div>
              <div className="ob-brand-text">
                <div className="ob-brand-title">Onion Bridge</div>
                <div className="ob-brand-sub">로컬 제어</div>
              </div>
            </div>

            <div className="ob-header-actions">
              {onProjects && workspaceLabel ? (
                <div
                  className="ob-workspace-switch"
                  title={workspacePath || undefined}
                >
                  <span className="ob-workspace-switch-label">
                    <span className="ob-workspace-switch-kicker">Workspace</span>
                    <strong className="ob-truncate">{workspaceLabel}</strong>
                  </span>
                  <button
                    type="button"
                    className="ob-btn ob-btn-ghost ob-btn-sm"
                    onClick={changeWorkspace}
                  >
                    변경
                  </button>
                </div>
              ) : null}

              <nav className="ob-nav" aria-label="주요 메뉴">
                <Link
                  to="/"
                  search={
                    workspacePath ? { workspace: workspacePath } : undefined
                  }
                  activeProps={{ className: 'active' }}
                >
                  프로젝트
                </Link>
                <Link to="/settings" activeProps={{ className: 'active' }}>
                  설정
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="ob-main">
          <ControlAuthGate>
            <Outlet />
          </ControlAuthGate>
        </main>
      </div>
    </ToastProvider>
  )
}
