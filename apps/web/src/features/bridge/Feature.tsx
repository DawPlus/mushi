import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import {
  FolderOpenIcon,
  FoldersIcon,
  HeartIcon,
  RadioIcon,
  SettingsIcon,
  WaypointsIcon,
} from 'lucide-animated'
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { AppAnimatedList, AppBlurFade, AppButton, AppConfirmDialog, AppMagicCard } from '../../components/common'
import { ownerRequest } from '../../lib/owner-api'
import { cn } from '../../lib/utils'

type IconHandle = { startAnimation: () => void; stopAnimation: () => void }
type AnimatedIcon = ComponentType<{ size?: number; animateOnHover?: boolean; className?: string; ref?: Ref<IconHandle> }>

function BridgeMotionIcon({
  icon: Icon,
  size = 18,
  className,
  intervalMs = 3400,
}: {
  icon: AnimatedIcon
  size?: number
  className?: string
  intervalMs?: number
}) {
  const iconRef = useRef<IconHandle>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    iconRef.current?.startAnimation()
    const timer = window.setInterval(() => iconRef.current?.startAnimation(), intervalMs)
    return () => {
      window.clearInterval(timer)
      iconRef.current?.stopAnimation()
    }
  }, [intervalMs])
  return <Icon ref={iconRef} size={size} animateOnHover={false} className={className} aria-hidden="true" />
}

type Status = { state: 'idle' | 'running' | 'error'; activeLabel: string | null }
type Dev = { state: string; url: string | null; command: string | null; logs: string[] }
type Project = {
  id: string
  name: string
  favorite: boolean
  hidden: boolean
  tunnel: string
  external: boolean
  managedTunnel: boolean
  tunnelLogs: string[]
  profile: string | null
  tunnelPort: number | null
  dev: Dev
}
type ConfirmKind = 'tunnel-start' | 'tunnel-stop' | 'dev-start' | 'dev-stop'

const key = ['owner', 'bridge'] as const
const storedWorkspace = () => {
  try { return window.localStorage.getItem('mushi.bridge.workspace') } catch { return null }
}

function StatusSwitch({
  on,
  label,
  disabled,
  onToggle,
}: {
  on: boolean
  label: string
  disabled?: boolean
  onToggle?: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} ${on ? '켜짐' : '꺼짐'}`}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-300 motion-reduce:transition-none',
        on
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/80 bg-muted/25 text-muted-foreground hover:bg-muted/40',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('text-[10px] font-medium tabular-nums transition-colors duration-300', on ? 'text-primary' : 'text-muted-foreground')}>
          {on ? 'ON' : 'OFF'}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'relative h-4 w-7 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300 ease-out motion-reduce:transition-none',
            on
              ? 'bg-primary shadow-[0_0_12px_color-mix(in_oklab,var(--brand-skymint)_50%,transparent)]'
              : 'bg-muted-foreground/35',
          )}
        >
          {on && (
            <>
              <span className="absolute top-1/2 left-[calc(100%-0.55rem)] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/45 motion-safe:animate-ping" />
              <span className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-pulse" />
            </>
          )}
          <span
            className={cn(
              'absolute top-0.5 left-0.5 z-[1] size-3 rounded-full bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none',
              on && 'translate-x-3',
            )}
          />
        </span>
      </span>
    </button>
  )
}

export default function Feature() {
  const cache = useQueryClient()
  const [workspace, setWorkspace] = useState<string | null>(storedWorkspace)
  const [filter, setFilter] = useState<'all' | 'idle' | 'favorite'>('all')
  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [detail, setDetail] = useState<Project | null>(null)
  const [detailPanel, setDetailPanel] = useState<'tunnel' | 'dev'>('tunnel')
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; project: Project } | null>(null)
  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const openDetail = (project: Project) => {
    setDetail(project)
    setDetailPanel('tunnel')
  }
  const settings = useQuery({
    queryKey: [...key, 'configuration'],
    queryFn: () => ownerRequest<{ cliReady: boolean; defaultTunnelReady: boolean; profiles: { name: string; running: boolean; port: number }[] }>('owner/bridge/configuration'),
    enabled: settingsOpen, retry: false,
  })
  const status = useQuery({ queryKey: key, queryFn: () => ownerRequest<Status>('owner/bridge'), refetchInterval: 5000, retry: false })
  const projects = useQuery({
    queryKey: [...key, 'projects', workspace],
    queryFn: () => ownerRequest<{ projects: Project[] }>(`owner/bridge/projects?workspace=${encodeURIComponent(workspace!)}`),
    enabled: workspace !== null, refetchInterval: 5000, retry: false,
  })
  const picker = useMutation({
    mutationFn: () => ownerRequest<{ cancelled: boolean; directory: string | null }>('owner/bridge/pick-workspace', { method: 'POST' }),
    onSuccess: result => {
      if (result.cancelled || result.directory === null) return
      setWorkspace(result.directory)
      setDetail(null)
      setMessage('')
      try { window.localStorage.setItem('mushi.bridge.workspace', result.directory) } catch { /* no storage */ }
    },
    onError: () => setMessage('Mac의 Finder 폴더 선택창을 열지 못했습니다. API가 Mac 데스크톱 세션에서 실행 중인지 확인해 주세요.'),
  })
  const tunnelAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' }) =>
      ownerRequest('owner/bridge/tunnel-action', { method: 'POST', body: { id, action } }),
    onSuccess: () => { setMessage(''); setConfirm(null); void cache.invalidateQueries({ queryKey: [...key, 'projects', workspace] }) },
    onError: (_error, variables) => setMessage(
      variables.action === 'stop'
        ? 'TUNNEL을 끄지 못했습니다. Onion 프로세스 상태를 확인한 뒤 다시 시도해 주세요.'
        : 'Onion Bridge 실행에 실패했습니다. 프로젝트 프로필과 실행 파일을 확인해 주세요.',
    ),
  })
  const devAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' }) =>
      ownerRequest('owner/bridge/dev-action', { method: 'POST', body: { id, action } }),
    onSuccess: () => { setMessage(''); setConfirm(null); void cache.invalidateQueries({ queryKey: [...key, 'projects', workspace] }) },
    onError: (_error, variables) => setMessage(
      variables.action === 'stop'
        ? 'DEV 서버를 끄지 못했습니다.'
        : 'DEV 서버 실행 상태를 변경하지 못했습니다.',
    ),
  })
  const flag = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: 'favorite' | 'hidden'; value: boolean }) =>
      ownerRequest('owner/bridge/project-flag', { method: 'POST', body: { id, flag: field, value } }),
    onSuccess: () => { void cache.invalidateQueries({ queryKey: [...key, 'projects', workspace] }) },
    onError: () => setMessage('설정 저장에 실패했습니다.'),
  })
  const all = projects.data?.projects ?? []
  const visible = all.filter(p => (showHidden || !p.hidden) && p.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'all' || (filter === 'favorite' ? p.favorite : p.tunnel !== 'running' && p.dev.state !== 'running')))
  const active = visible.filter(p => p.tunnel === 'running' || p.dev.state === 'running')
  const favorites = visible.filter(p => p.tunnel !== 'running' && p.dev.state !== 'running' && p.favorite)
  const rest = visible.filter(p => p.tunnel !== 'running' && p.dev.state !== 'running' && !p.favorite)
  const detailProject = all.find(p => p.id === detail?.id) ?? detail
  const toggle = (p: Project, field: 'favorite' | 'hidden') => flag.mutate({ id: p.id, field, value: !p[field] })
  const confirmBusy = tunnelAction.isPending || devAction.isPending

  const confirmCopy = confirm ? ({
    'tunnel-start': {
      title: 'TUNNEL 시작',
      description: `${confirm.project.name} TUNNEL을 시작할까요?`,
    },
    'tunnel-stop': {
      title: 'TUNNEL 중지',
      description: `${confirm.project.name} TUNNEL을 중지할까요?`,
    },
    'dev-start': {
      title: 'DEV 시작',
      description: `${confirm.project.name} DEV 서버를 시작할까요?`,
    },
    'dev-stop': {
      title: 'DEV 중지',
      description: `${confirm.project.name} DEV 서버를 중지할까요?`,
    },
  } as const)[confirm.kind] : null

  const runConfirm = () => {
    if (!confirm) return
    const { kind, project } = confirm
    if (kind === 'tunnel-start' || kind === 'tunnel-stop') {
      tunnelAction.mutate({
        id: project.id,
        action: kind === 'tunnel-start' ? 'start' : 'stop',
      })
      return
    }
    devAction.mutate({
      id: project.id,
      action: kind === 'dev-start' ? 'start' : 'stop',
    })
  }

  const section = (
    title: string,
    list: Project[],
    tone: 'live' | 'favorite' | 'rest' = 'rest',
    delay = 0,
  ): ReactNode => (
    list.length === 0 ? null : (
      <section
        aria-label={title}
        className={cn(
          'grid gap-3 rounded-2xl border p-3.5 sm:p-4',
          tone === 'live' && 'border-primary/25 bg-primary/[0.04]',
          tone === 'favorite' && 'border-border/80 bg-card/50',
          tone === 'rest' && 'border-border/60 bg-background/40',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BridgeMotionIcon
              icon={tone === 'live' ? RadioIcon : tone === 'favorite' ? HeartIcon : FoldersIcon}
              size={15}
              className={cn(
                tone === 'live' && 'text-primary',
                tone === 'favorite' && 'text-chart-2',
                tone === 'rest' && 'text-muted-foreground',
              )}
            />
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {title}
            </h2>
          </div>
          <span className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums',
            tone === 'live' && 'border-primary/30 bg-primary/10 text-primary',
            tone === 'favorite' && 'border-border bg-muted/40 text-foreground',
            tone === 'rest' && 'border-border/70 bg-muted/20 text-muted-foreground',
          )}>
            {list.length}
          </span>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, index) => {
            const tunnelOn = p.tunnel === 'running'
            const devOn = p.dev.state === 'running'
            const live = tunnelOn || devOn
            return (
              <AppBlurFade key={p.id} delay={delay + index * 0.03} inView>
                <AppMagicCard className={cn(
                  'rounded-xl border border-border/70 bg-card/80 transition-[box-shadow,border-color]',
                  live && 'border-primary/25 shadow-[0_0_20px_color-mix(in_oklab,var(--brand-skymint)_10%,transparent)]',
                )}>
                  <div className="grid gap-2.5 p-3.5">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        aria-label={p.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        onClick={() => toggle(p, 'favorite')}
                        className={cn('mt-0.5 cursor-pointer text-sm', p.favorite ? 'text-primary' : 'text-muted-foreground')}
                      >
                        {p.favorite ? '★' : '☆'}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <button
                            type="button"
                            className="shrink-0 truncate text-left text-sm font-semibold text-foreground hover:underline"
                            onClick={() => openDetail(p)}
                          >
                            {p.name}
                          </button>
                          <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={p.id}>
                            {p.id}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={p.hidden ? '숨김 해제' : '숨기기'}
                        title={p.hidden ? '숨김 해제' : '숨기기'}
                        onClick={() => toggle(p, 'hidden')}
                        className="mt-0.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {p.hidden ? '↺' : '×'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusSwitch
                        on={tunnelOn}
                        label="TUNNEL"
                        disabled={tunnelAction.isPending}
                        onToggle={() => setConfirm({
                          kind: tunnelOn ? 'tunnel-stop' : 'tunnel-start',
                          project: p,
                        })}
                      />
                      <StatusSwitch
                        on={devOn}
                        label="DEV"
                        disabled={devAction.isPending}
                        onToggle={() => setConfirm({
                          kind: devOn ? 'dev-stop' : 'dev-start',
                          project: p,
                        })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
                      <AppButton
                        size="sm"
                        variant={tunnelOn ? 'destructive' : 'secondary'}
                        className={tunnelOn ? undefined : 'border border-border bg-background shadow-sm'}
                        disabled={tunnelAction.isPending}
                        onClick={() => setConfirm({
                          kind: tunnelOn ? 'tunnel-stop' : 'tunnel-start',
                          project: p,
                        })}
                      >
                        TUNNEL {tunnelOn ? '끄기' : '켜기'}
                      </AppButton>
                      <AppButton
                        size="sm"
                        variant={devOn ? 'destructive' : 'secondary'}
                        className={devOn ? undefined : 'border border-border bg-background shadow-sm'}
                        disabled={devAction.isPending}
                        onClick={() => setConfirm({
                          kind: devOn ? 'dev-stop' : 'dev-start',
                          project: p,
                        })}
                      >
                        DEV {devOn ? '끄기' : '켜기'}
                      </AppButton>
                      {p.dev.url && (
                        <a
                          href={p.dev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-primary"
                        >
                          Local ↗
                        </a>
                      )}
                      <AppButton size="sm" variant="outline" className="ml-auto" onClick={() => openDetail(p)}>
                        상세
                      </AppButton>
                    </div>
                  </div>
                </AppMagicCard>
              </AppBlurFade>
            )
          })}
        </div>
      </section>
    )
  )

  const detailDrawer = detailProject && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="fixed inset-0 z-[60] flex justify-end bg-black/50"
        onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null) }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="프로젝트 상세"
          className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <h2 className="shrink-0 truncate text-xl font-semibold">{detailProject.name}</h2>
              <p className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={detailProject.id}>
                {detailProject.id}
              </p>
            </div>
            <AppButton variant="outline" onClick={() => setDetail(null)}>닫기</AppButton>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4 sm:px-6">
            {([
              {
                key: 'tunnel' as const,
                title: 'TUNNEL',
                running: detailProject.tunnel === 'running',
                pending: tunnelAction.isPending,
                meta: [
                  detailProject.tunnel,
                  detailProject.external ? '외부 실행' : null,
                  detailProject.profile,
                  detailProject.tunnelPort ? `port ${detailProject.tunnelPort}` : null,
                ].filter(Boolean).join(' · '),
                logs: detailProject.tunnelLogs,
                onToggle: () => setConfirm({
                  kind: detailProject.tunnel === 'running' ? 'tunnel-stop' : 'tunnel-start',
                  project: detailProject,
                }),
              },
              {
                key: 'dev' as const,
                title: 'DEV',
                running: detailProject.dev.state === 'running',
                pending: devAction.isPending,
                meta: [
                  detailProject.dev.state,
                  detailProject.dev.command || '명령 없음',
                ].join(' · '),
                url: detailProject.dev.url,
                logs: detailProject.dev.logs,
                onToggle: () => setConfirm({
                  kind: detailProject.dev.state === 'running' ? 'dev-stop' : 'dev-start',
                  project: detailProject,
                }),
              },
            ]).map(panel => {
              const open = detailPanel === panel.key
              return (
                <div
                  key={panel.key}
                  className={cn(
                    'flex min-h-0 flex-col rounded-xl border border-border/70 bg-background/50',
                    open ? 'flex-1' : 'shrink-0',
                  )}
                >
                  <div className="flex shrink-0 flex-wrap items-center gap-2 p-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`bridge-detail-${panel.key}`}
                      onClick={() => setDetailPanel(panel.key)}
                      className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/40"
                    >
                      <ChevronDown
                        size={16}
                        className={cn(
                          'shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                          !open && '-rotate-90',
                        )}
                      />
                      <span className="text-sm font-semibold tracking-wide">{panel.title}</span>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{panel.meta}</span>
                    </button>
                    <div className="w-full sm:w-auto sm:min-w-[11rem]">
                      <StatusSwitch
                        on={panel.running}
                        label={panel.title}
                        disabled={panel.pending}
                        onToggle={panel.onToggle}
                      />
                    </div>
                  </div>
                  {open && (
                    <div id={`bridge-detail-${panel.key}`} className="flex min-h-0 flex-1 flex-col gap-2 border-t border-border/60 p-3 pt-3">
                      {'url' in panel && panel.url && (
                        <a
                          className="shrink-0 text-xs text-primary underline"
                          href={panel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {panel.url}
                        </a>
                      )}
                      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border/50 bg-card p-3 text-xs leading-relaxed">
                        {panel.logs.join('\n') || '기록 없음'}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </div>,
      document.body,
    )
    : null

  return (
    <section aria-label="Bridge" className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 px-4 py-3.5 backdrop-blur-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-24 top-0 size-28 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <BridgeMotionIcon icon={WaypointsIcon} size={20} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Onion Bridge</p>
              <h1 className="text-xl font-semibold tracking-tight">Workspace</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="max-w-40 truncate text-xs text-muted-foreground">
              {workspace === null ? '선택 안 됨' : workspace || 'workspace'}
            </p>
            <AppButton size="sm" variant="outline" disabled={picker.isPending} onClick={() => picker.mutate()}>
              {picker.isPending ? 'Finder 대기 중…' : '워크스페이스 변경'}
            </AppButton>
            <AppButton size="sm" variant="outline" onClick={() => setSettingsOpen(value => !value)}>
              {settingsOpen ? '설정 닫기' : '설정'}
            </AppButton>
          </div>
        </div>
      </header>
      {settingsOpen && (
        <AppMagicCard className="overflow-hidden rounded-2xl border border-border/70">
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-muted-foreground">
                  <BridgeMotionIcon icon={SettingsIcon} size={18} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Configuration</p>
                  <h2 className="text-base font-semibold tracking-tight">Onion Bridge 연결 설정</h2>
                </div>
              </div>
              <AppButton size="sm" variant="ghost" onClick={() => setSettingsOpen(false)}>닫기</AppButton>
            </div>
            {settings.isPending && <p className="text-sm text-muted-foreground">확인 중…</p>}
            {settings.isError && <p role="alert" className="text-sm text-destructive">설정을 확인하지 못했습니다.</p>}
            {settings.data && (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">원본 CLI</p>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        settings.data.cliReady
                          ? 'border-primary/35 bg-primary/10 text-primary'
                          : 'border-border bg-muted/40 text-muted-foreground',
                      )}>
                        <span className={cn('size-1.5 rounded-full', settings.data.cliReady ? 'bg-primary' : 'bg-muted-foreground/45')} />
                        {settings.data.cliReady ? '준비됨' : '없음'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">Onion Bridge CLI</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">기본 Tunnel ID</p>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        settings.data.defaultTunnelReady
                          ? 'border-primary/35 bg-primary/10 text-primary'
                          : 'border-destructive/30 bg-destructive/10 text-destructive',
                      )}>
                        <span className={cn(
                          'size-1.5 rounded-full',
                          settings.data.defaultTunnelReady ? 'bg-primary' : 'bg-destructive',
                        )} />
                        {settings.data.defaultTunnelReady ? '설정됨' : '설정 필요'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">Default Tunnel</p>
                  </div>
                </div>
                <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  프로필은 TUNNEL 시작 시 기존 Onion Bridge 방식으로 자동 준비됩니다. 비밀키는 화면에 표시하지 않습니다.
                </p>
                <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
                  <button
                    type="button"
                    aria-expanded={profilesOpen}
                    onClick={() => setProfilesOpen(value => !value)}
                    className="flex w-full items-center gap-2 px-3.5 py-3 text-left hover:bg-muted/30"
                  >
                    <ChevronDown
                      size={16}
                      className={cn(
                        'shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                        !profilesOpen && '-rotate-90',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Profiles</p>
                      <p className="mt-0.5 text-sm text-foreground">
                        {settings.data.profiles.filter(p => p.running).length} 실행 중 · 전체 {settings.data.profiles.length}
                      </p>
                    </div>
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {settings.data.profiles.length}
                    </span>
                  </button>
                  {profilesOpen && (
                    <div className="border-t border-border/60 p-2">
                      {settings.data.profiles.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                          등록된 프로필이 없습니다.
                        </p>
                      ) : (
                        <AppAnimatedList
                          items={settings.data.profiles}
                          getKey={item => item.name}
                          enableArrowNavigation={false}
                          className="rounded-lg"
                          listClassName="max-h-56"
                          renderItem={(p, selected) => (
                            <div className={cn(
                              'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors',
                              selected
                                ? 'border-primary/30 bg-primary/10'
                                : 'border-border/60 bg-background/50',
                            )}>
                              <span className="min-w-0 flex-1 truncate font-mono text-sm">{p.name}</span>
                              <span className="text-xs tabular-nums text-muted-foreground">:{p.port}</span>
                              <span className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                p.running
                                  ? 'border-primary/35 bg-primary/10 text-primary'
                                  : 'border-border bg-muted/30 text-muted-foreground',
                              )}>
                                <span className="relative flex size-1.5">
                                  {p.running && (
                                    <span className="absolute inset-0 rounded-full bg-primary/55 motion-safe:animate-ping" />
                                  )}
                                  <span className={cn(
                                    'relative size-1.5 rounded-full',
                                    p.running ? 'bg-primary' : 'bg-muted-foreground/45',
                                  )} />
                                </span>
                                {p.running ? '실행 중' : '대기'}
                              </span>
                            </div>
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </AppMagicCard>
      )}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      {status.isError && <p role="alert" className="text-sm text-destructive">Bridge 상태를 확인할 수 없습니다.</p>}
      {workspace === null ? (
        <AppMagicCard className="rounded-xl">
          <div className="grid justify-items-center gap-3 p-8 text-center">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <BridgeMotionIcon icon={FolderOpenIcon} size={28} intervalMs={2800} />
            </div>
            <h2 className="text-base font-semibold">워크스페이스를 선택하세요</h2>
            <p className="max-w-sm text-sm text-muted-foreground">Mac Finder에서 폴더를 선택하면 하위 프로젝트들이 카드로 표시됩니다.</p>
            <AppButton disabled={picker.isPending} onClick={() => picker.mutate()}>
              Finder에서 워크스페이스 선택
            </AppButton>
          </div>
        </AppMagicCard>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              aria-label="프로젝트 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="프로젝트 검색…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-sm md:max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'idle', 'favorite'] as const).map(f => (
                <AppButton key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                  {{ all: '전체', idle: '꺼짐', favorite: '즐겨찾기' }[f]}
                </AppButton>
              ))}
              <AppButton size="sm" variant="outline" onClick={() => setShowHidden(v => !v)}>
                {showHidden ? '숨김 닫기' : '숨김 보기'}
              </AppButton>
            </div>
          </div>
          {projects.isPending && <p role="status">프로젝트 검색 중…</p>}
          {projects.isError && (
            <p role="alert" className="text-destructive">
              프로젝트 목록을 불러오지 못했습니다. 선택한 워크스페이스를 확인해 주세요.
            </p>
          )}
          {section('활성 프로젝트', active, 'live', 0)}
          {section('즐겨찾기', favorites, 'favorite', 0.04)}
          {section('나머지 프로젝트', rest, 'rest', 0.08)}
          {projects.isSuccess && visible.length === 0 && (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">표시할 프로젝트가 없습니다.</p>
          )}
        </>
      )}
      {detailDrawer}
      <AppConfirmDialog
        open={confirm !== null}
        onOpenChange={open => { if (!open && !confirmBusy) setConfirm(null) }}
        title={confirmCopy?.title ?? '확인'}
        description={confirmCopy?.description ?? ''}
        pending={confirmBusy}
        onConfirm={runConfirm}
      />
    </section>
  )
}
