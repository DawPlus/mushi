import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  api,
  type Project,
  type WorkspaceRoot,
} from '../lib/api'
import { AnimatedItem, AnimatedList } from '../components/AnimatedList'
import { ProjectCard, stateLabel } from '../components/ProjectCard'
import { LiveLog } from '../components/LiveLog'
import { DecryptedText } from '../components/DecryptedText'
import { KineticText } from '../components/KineticText'
import { WorkspacePicker } from '../components/WorkspacePicker'
import { useToast } from '../components/Toast'
import {
  projectInWorkspace,
  readStoredWorkspace,
  workspaceBasename,
  writeStoredWorkspace,
} from '../lib/activeWorkspace'

type FilterKind = 'all' | 'idle' | 'error' | 'favorite'

type DashboardSearch = {
  q?: string
  filter?: FilterKind
  workspace?: string
}

const FILTERS: Array<{ id: FilterKind; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'idle', label: '꺼짐' },
  { id: 'error', label: '오류' },
  { id: 'favorite', label: '즐겨찾기' },
]

function parseFilter(value: unknown): FilterKind {
  if (value === 'idle' || value === 'error' || value === 'favorite') {
    return value
  }
  return 'all'
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    filter: parseFilter(search.filter),
    workspace:
      typeof search.workspace === 'string' ? search.workspace : undefined,
  }),
  component: Dashboard,
})

function matchesQuery(project: Project, q: string) {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    project.name.toLowerCase().includes(needle) ||
    project.path.toLowerCase().includes(needle) ||
    (project.profile || '').toLowerCase().includes(needle)
  )
}

function matchesFilter(project: Project, filter: FilterKind) {
  switch (filter) {
    case 'idle':
      return project.state === 'idle'
    case 'error':
      return project.state === 'error'
    case 'favorite':
      return Boolean(project.favorite) && !project.hidden
    default:
      return true
  }
}

function isLive(project: Project) {
  return (
    project.active ||
    project.state === 'running' ||
    project.state === 'starting' ||
    project.state === 'stopping'
  )
}

function ProjectDrawer({
  project,
  onClose,
}: {
  project: Project
  onClose: () => void
}) {
  const devLive =
    project.dev?.state === 'running' ||
    project.dev?.state === 'starting' ||
    project.dev?.state === 'stopping'
  const tunnelLive = isLive(project)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="ob-drawer-root" role="dialog" aria-modal="true" aria-label={`${project.name} 상세`}>
      <button
        type="button"
        className="ob-drawer-backdrop"
        aria-label="상세 닫기"
        onClick={onClose}
      />
      <aside className="ob-project-drawer">
        <div className="ob-drawer-head">
          <div className="ob-drawer-title">
            <span className="ob-runtime-label">Project detail</span>
            <h2>{project.name}</h2>
            <p title={project.path}>{project.path}</p>
          </div>
          <button type="button" className="ob-card-dismiss" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ob-drawer-status-grid">
          <div className="ob-drawer-stat">
            <span>Tunnel</span>
            <strong>{stateLabel(project.state)}</strong>
            <small>PID {project.pid ?? '—'}</small>
          </div>
          <div className="ob-drawer-stat">
            <span>Dev</span>
            <strong>{stateLabel(project.dev?.state || 'idle')}</strong>
            <small>PID {project.dev?.pid ?? '—'}</small>
          </div>
        </div>

        <section className="ob-drawer-section">
          <h3>Connection</h3>
          <dl className="ob-detail-list">
            <div>
              <dt>Profile</dt>
              <dd>{project.profile || '—'}</dd>
            </div>
            <div>
              <dt>Tunnel</dt>
              <dd>{project.tunnelProfile || project.tunnelId || '—'}</dd>
            </div>
            <div>
              <dt>Dev command</dt>
              <dd>{project.dev?.command || '—'}</dd>
            </div>
            <div>
              <dt>Dev URL</dt>
              <dd>
                {project.dev?.url ? (
                  <a href={project.dev.url} target="_blank" rel="noreferrer">
                    {project.dev.url} ↗
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </section>

        <div className="ob-drawer-logs">
          <section className="ob-drawer-section is-log">
            <h3>Tunnel log</h3>
            <LiveLog lines={project.recentLogs || []} live={tunnelLive} />
          </section>

          <section className="ob-drawer-section is-log">
            <h3>Dev log</h3>
            <LiveLog lines={project.dev?.recentLogs || []} live={devLive} />
          </section>
        </div>
      </aside>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate({ from: '/' })
  const toast = useToast()
  const search = Route.useSearch()
  const query = search.q || ''
  const filter = search.filter || 'all'
  const workspacePath = search.workspace || null

  const [projects, setProjects] = useState<Project[]>([])
  const [roots, setRoots] = useState<WorkspaceRoot[]>([])
  const [busyPath, setBusyPath] = useState<string | null>(null)
  const [devBusyPath, setDevBusyPath] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [queryDraft, setQueryDraft] = useState(query)
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const knownExternalRef = useRef<Set<string>>(new Set())
  const externalReadyRef = useRef(false)

  useEffect(() => {
    setQueryDraft(query)
  }, [query])

  const refresh = useCallback(async () => {
    const next = await api.projects()
    setProjects(next.projects)
    setRoots(next.roots || [])
    return next
  }, [])

  useEffect(() => {
    void refresh().catch((error: Error) => setMessage(error.message))
    const timer = setInterval(() => {
      void refresh().catch((error: Error) => setMessage(error.message))
    }, 2000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const external = projects.filter(
      (project) => project.active && project.managed === false,
    )
    const next = new Set(external.map((project) => project.path))
    if (!externalReadyRef.current) {
      knownExternalRef.current = next
      externalReadyRef.current = true
      return
    }
    for (const project of external) {
      if (!knownExternalRef.current.has(project.path)) {
        toast.push(`${project.name} 외부(터미널) 실행 감지`, 'warn')
      }
    }
    knownExternalRef.current = next
  }, [projects, toast])

  useEffect(() => {
    if (hydrated) return
    if (workspacePath) {
      setHydrated(true)
      return
    }
    const stored = readStoredWorkspace()
    if (stored?.path) {
      void navigate({
        search: (prev) => ({ ...prev, workspace: stored.path }),
        replace: true,
      })
    }
    setHydrated(true)
  }, [hydrated, workspacePath, navigate])

  useEffect(() => {
    if (!hydrated || roots.length === 0) {
      if (workspacePath) {
        writeStoredWorkspace({
          path: workspacePath,
          name: workspaceBasename(workspacePath),
        })
      }
      return
    }
    if (!workspacePath) {
      writeStoredWorkspace(null)
      return
    }
    const match = roots.find((root) => root.path === workspacePath)
    if (!match) {
      writeStoredWorkspace(null)
      void navigate({
        search: (prev) => ({
          ...prev,
          workspace: undefined,
        }),
        replace: true,
      })
      return
    }
    writeStoredWorkspace({ path: match.path, name: match.name })
  }, [hydrated, roots, workspacePath, navigate])

  const activeRoot = useMemo(
    () => roots.find((root) => root.path === workspacePath) || null,
    [roots, workspacePath],
  )
  const selectedProject = useMemo(
    () => projects.find((project) => project.path === selectedProjectPath) || null,
    [projects, selectedProjectPath],
  )

  const scopedProjects = useMemo(() => {
    if (!workspacePath) return []
    return projects.filter((project) =>
      projectInWorkspace(project, workspacePath),
    )
  }, [projects, workspacePath])

  const globalActive = useMemo(
    () => projects.filter((project) => isLive(project)),
    [projects],
  )

  /** Single active bridge detail (max 1). Shown instead of a separate Active list. */
  const activeDetail = globalActive[0] || null
  const activeSlotTaken = Boolean(activeDetail)
  const activeOutsideWorkspace = Boolean(
    activeDetail &&
      workspacePath &&
      !projectInWorkspace(activeDetail, workspacePath),
  )

  const filtered = useMemo(() => {
    return scopedProjects.filter(
      (project) =>
        !isLive(project) &&
        matchesQuery(project, query) &&
        matchesFilter(project, filter),
    )
  }, [scopedProjects, query, filter])

  const { favorites, visible, hidden } = useMemo(() => {
    const fav: Project[] = []
    const vis: Project[] = []
    const hid: Project[] = []
    for (const project of filtered) {
      if (project.hidden) {
        hid.push(project)
        continue
      }
      if (project.favorite) {
        fav.push(project)
      } else {
        vis.push(project)
      }
    }
    return { favorites: fav, visible: vis, hidden: hid }
  }, [filtered])

  const patchSearch = useCallback(
    (patch: Partial<DashboardSearch>) => {
      void navigate({
        search: (prev) => {
          const next: DashboardSearch = {
            q: patch.q !== undefined ? patch.q || undefined : prev.q,
            filter:
              patch.filter !== undefined
                ? patch.filter === 'all'
                  ? undefined
                  : patch.filter
                : prev.filter,
            workspace:
              patch.workspace !== undefined
                ? patch.workspace || undefined
                : prev.workspace,
          }
          return next
        },
        replace: true,
      })
    },
    [navigate],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryDraft === query) return
      patchSearch({ q: queryDraft.trim() || undefined })
    }, 220)
    return () => clearTimeout(timer)
  }, [queryDraft, query, patchSearch])

  function selectWorkspace(root: WorkspaceRoot) {
    writeStoredWorkspace({ path: root.path, name: root.name })
    setMessage(null)
    void navigate({
      search: {
        workspace: root.path,
      },
      replace: false,
    })
  }

  async function onStart(workspace: string) {
    const target = projects.find((project) => project.path === workspace)
    const alreadyThis = activeDetail?.path === workspace
    if (activeSlotTaken && !alreadyThis) {
      const msg = activeDetail
        ? `동시에 1개만 켤 수 있습니다. 먼저 ${activeDetail.name} 을(를) 끄세요.`
        : '동시에 실행할 수 있는 브릿지는 1개입니다.'
      setMessage(msg)
      toast.push(msg, 'warn')
      return
    }
    setBusyPath(workspace)
    setMessage(null)
    try {
      await api.start(workspace)
      await refresh()
      toast.push(`${target?.name || '프로젝트'} 켜짐`, 'ok')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setMessage(msg)
      toast.push(msg, 'warn')
      await refresh().catch(() => undefined)
    } finally {
      setBusyPath(null)
    }
  }

  async function onStop(workspace: string) {
    const target = projects.find((project) => project.path === workspace)
    setBusyPath(workspace)
    setMessage(null)
    try {
      await api.stop(workspace)
      await refresh()
      toast.push(`${target?.name || '프로젝트'} 꺼짐`, 'muted')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setMessage(msg)
      toast.push(msg, 'warn')
      await refresh().catch(() => undefined)
    } finally {
      setBusyPath(null)
    }
  }

  async function onStartDev(workspace: string) {
    const target = projects.find((project) => project.path === workspace)
    setDevBusyPath(workspace)
    setMessage(null)
    try {
      const status = await api.startDev(workspace)
      await refresh()
      toast.push(
        `${target?.name || '프로젝트'} Dev 켜짐${status.command ? ` · ${status.command}` : ''}`,
        'ok',
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setMessage(msg)
      toast.push(msg, 'warn')
      await refresh().catch(() => undefined)
    } finally {
      setDevBusyPath(null)
    }
  }

  async function onStopDev(workspace: string) {
    const target = projects.find((project) => project.path === workspace)
    setDevBusyPath(workspace)
    setMessage(null)
    try {
      await api.stopDev(workspace)
      await refresh()
      toast.push(`${target?.name || '프로젝트'} Dev 꺼짐`, 'muted')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setMessage(msg)
      toast.push(msg, 'warn')
      await refresh().catch(() => undefined)
    } finally {
      setDevBusyPath(null)
    }
  }

  async function onRemoveRoot(workspace: string) {
    setBusyPath(workspace)
    setMessage(null)
    try {
      const result = await api.removeProject(workspace)
      setProjects(result.projects)
      setRoots(result.roots || [])
      if (workspacePath === workspace) {
        writeStoredWorkspace(null)
        void navigate({ search: {}, replace: true })
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyPath(null)
    }
  }

  async function onToggleFavorite(project: Project) {
    setBusyPath(project.path)
    setMessage(null)
    try {
      const result = await api.setProjectFlags(project.path, {
        favorite: !project.favorite,
      })
      setProjects(result.projects)
      setRoots(result.roots || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyPath(null)
    }
  }

  async function onToggleHidden(project: Project, hidden: boolean) {
    setBusyPath(project.path)
    setMessage(null)
    try {
      const result = await api.setProjectFlags(project.path, { hidden })
      setProjects(result.projects)
      setRoots(result.roots || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyPath(null)
    }
  }

  const cardHandlers = {
    onStart: (workspace: string) => void onStart(workspace),
    onStop: (workspace: string) => void onStop(workspace),
    onStartDev: (workspace: string) => void onStartDev(workspace),
    onStopDev: (workspace: string) => void onStopDev(workspace),
    onToggleFavorite: (project: Project) => void onToggleFavorite(project),
    onToggleHidden: (project: Project, hidden: boolean) =>
      void onToggleHidden(project, hidden),
  }

  function renderCard(project: Project, index: number) {
    const startBlocked = activeSlotTaken && !isLive(project)
    return (
      <AnimatedItem
        key={project.path}
        index={index}
        delay={Math.min(index * 0.05, 0.35)}
      >
        <ProjectCard
          project={project}
          busy={busyPath === project.path}
          devBusy={devBusyPath === project.path}
          startBlocked={startBlocked}
          onOpen={(item) => setSelectedProjectPath(item.path)}
          {...cardHandlers}
        />
      </AnimatedItem>
    )
  }

  if (!hydrated) {
    return <div className="ob-page" />
  }

  if (!workspacePath) {
    return (
      <WorkspacePicker
        roots={roots}
        busyPath={busyPath}
        message={message}
        onSelect={selectWorkspace}
        onAdded={(nextRoots, selected) => {
          setRoots(nextRoots)
          selectWorkspace(selected)
        }}
        onRemove={(path) => void onRemoveRoot(path)}
        onMessage={setMessage}
        onBusy={setBusyPath}
      />
    )
  }

  return (
    <div className="ob-page">
      <section className="ob-hero ob-hero-row">
        <div className="ob-hero-copy">
          <KineticText
            text={activeRoot?.name || workspaceBasename(workspacePath)}
            className="ob-hero-kinetic"
          />
          <p className="ob-hero-sub">
            <DecryptedText
              text="package.json · 1-depth · bridge control"
              animateOn="view"
              className="ob-hero-decrypt"
            />
          </p>
        </div>
        <div className="ob-hero-tools" aria-label="검색과 필터">
          <input
            id="project-search"
            className="ob-input ob-input-compact"
            value={queryDraft}
            placeholder="검색…"
            aria-label="프로젝트 검색"
            onChange={(event) => setQueryDraft(event.target.value)}
            spellCheck={false}
          />
          <div className="ob-filter-row" role="group" aria-label="상태 필터">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={[
                  'ob-chip-btn',
                  (filter || 'all') === item.id ? 'is-on' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => patchSearch({ filter: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeOutsideWorkspace && activeDetail ? (
        <p className="ob-alert ob-alert-warn">
          다른 workspace의 <strong>{activeDetail.name}</strong> 이(가) 실행
          중입니다. 아래에서 끄거나 헤더에서 해당 workspace로 이동하세요.
        </p>
      ) : null}

      {message ? <p className="ob-alert ob-alert-warn">{message}</p> : null}

      {activeDetail ? (
        <section className="ob-active-slot" aria-label="실행 중">
          <ProjectCard
            project={activeDetail}
            busy={busyPath === activeDetail.path}
            devBusy={devBusyPath === activeDetail.path}
            startBlocked={false}
            onOpen={(item) => setSelectedProjectPath(item.path)}
            onLogCopied={() => toast.push('로그 복사됨', 'muted')}
            {...cardHandlers}
          />
        </section>
      ) : null}

      {favorites.length > 0 ? (
        <section className="ob-section" aria-labelledby="fav-heading">
          <div className="ob-section-head">
            <h2 id="fav-heading" className="ob-section-title">
              즐겨찾기
            </h2>
            <span className="ob-section-count">{favorites.length}</span>
          </div>
          <AnimatedList className="ob-project-list">
            {favorites.map((project, index) => renderCard(project, index))}
          </AnimatedList>
        </section>
      ) : null}

      <section className="ob-section" aria-labelledby="all-heading">
        <div className="ob-section-head">
          <h2 id="all-heading" className="ob-section-title">
            {favorites.length > 0 ? '나머지 패키지' : '패키지 목록'}
          </h2>
          <span className="ob-section-count">{visible.length}</span>
        </div>
        <AnimatedList className="ob-project-list">
          {visible.length === 0 && favorites.length === 0 ? (
            <div className="ob-empty">
              {query || filter !== 'all'
                ? '검색·필터에 맞는 패키지가 없습니다.'
                : '이 workspace 아래 package.json 폴더가 없습니다.'}
            </div>
          ) : visible.length === 0 ? (
            <div className="ob-empty">
              즐겨찾기 외 표시할 패키지가 없습니다.
            </div>
          ) : (
            visible.map((project, index) =>
              renderCard(project, favorites.length + index),
            )
          )}
        </AnimatedList>
      </section>

      {hidden.length > 0 ? (
        <section className="ob-section" aria-labelledby="hidden-heading">
          <div className="ob-section-head">
            <h2 id="hidden-heading" className="ob-section-title">
              숨긴 패키지
            </h2>
            <button
              type="button"
              className="ob-btn ob-btn-ghost ob-btn-sm"
              onClick={() => setShowHidden((value) => !value)}
            >
              {showHidden ? '접기' : `보기 (${hidden.length})`}
            </button>
          </div>
          {showHidden ? (
            <AnimatedList className="ob-project-list is-dimmed">
              {hidden.map((project, index) => renderCard(project, index))}
            </AnimatedList>
          ) : null}
        </section>
      ) : null}

      {selectedProject ? (
        <ProjectDrawer
          project={selectedProject}
          onClose={() => setSelectedProjectPath(null)}
        />
      ) : null}
    </div>
  )
}
