import { useState } from 'react'
import type { OnionState, Project } from '../lib/api'
import { ConfirmDialog } from './ConfirmDialog'
import { LiveLog } from './LiveLog'
import { ShinyToggleButton } from './ShinyToggleButton'
import { StarBorder } from './StarBorder'

export function stateLabel(state: OnionState) {
  switch (state) {
    case 'idle':
      return '꺼짐'
    case 'starting':
      return '시작 중'
    case 'running':
      return '켜짐'
    case 'stopping':
      return '중지 중'
    case 'error':
      return '오류'
    default:
      return state
  }
}

type ConfirmKind = 'tunnel-on' | 'tunnel-off' | 'dev-on' | 'dev-off' | 'hide'

export type ProjectCardProps = {
  project: Project
  busy: boolean
  devBusy?: boolean
  selected?: boolean
  compact?: boolean
  showLogs?: boolean
  /** Always-on live log panel (Active section). */
  liveLogs?: boolean
  /** When true, turning ON is blocked (another bridge already active). */
  startBlocked?: boolean
  onOpen?: (project: Project) => void
  onStart: (workspace: string) => void
  onStop: (workspace: string) => void
  onStartDev: (workspace: string) => void
  onStopDev: (workspace: string) => void
  onToggleFavorite: (project: Project) => void
  onToggleHidden: (project: Project, hidden: boolean) => void
  onToggleLogs?: (project: Project) => void
  onLogCopied?: () => void
}

function confirmCopy(kind: ConfirmKind, name: string) {
  switch (kind) {
    case 'tunnel-on':
      return {
        title: 'Tunnel 켜기',
        description: `${name} MCP 터널을 시작할까요?`,
        confirmLabel: '켜기',
        tone: 'ok' as const,
      }
    case 'tunnel-off':
      return {
        title: 'Tunnel 끄기',
        description: `${name} MCP 터널을 중지할까요?`,
        confirmLabel: '끄기',
        tone: 'danger' as const,
      }
    case 'dev-on':
      return {
        title: 'Dev 켜기',
        description: `${name} 개발 서버를 시작할까요?`,
        confirmLabel: '켜기',
        tone: 'ok' as const,
      }
    case 'dev-off':
      return {
        title: 'Dev 끄기',
        description: `${name} 개발 서버를 중지할까요?`,
        confirmLabel: '끄기',
        tone: 'danger' as const,
      }
    case 'hide':
      return {
        title: '목록에서 숨기기',
        description: `${name}을(를) 목록에서 숨길까요?`,
        confirmLabel: '숨기기',
        tone: 'danger' as const,
      }
  }
}

export function ProjectCard({
  project,
  busy,
  devBusy = false,
  selected = false,
  compact = false,
  showLogs = false,
  liveLogs = false,
  startBlocked = false,
  onOpen,
  onStart,
  onStop,
  onStartDev,
  onStopDev,
  onToggleFavorite,
  onToggleHidden,
  onToggleLogs,
  onLogCopied,
}: ProjectCardProps) {
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)

  const powered =
    project.active || project.state === 'running' || project.state === 'starting'
  const live =
    project.active ||
    project.state === 'running' ||
    project.state === 'starting' ||
    project.state === 'stopping'
  const toggleBusy =
    busy || project.state === 'starting' || project.state === 'stopping'
  const showLogPane = liveLogs || showLogs
  const devPowered =
    project.dev?.state === 'running' || project.dev?.state === 'starting'
  const devToggleBusy =
    devBusy || project.dev?.state === 'starting' || project.dev?.state === 'stopping'

  const confirm = confirmKind ? confirmCopy(confirmKind, project.name) : null

  function requestToggle(kind: ConfirmKind) {
    setConfirmKind(kind)
  }

  function runConfirm() {
    if (!confirmKind) return
    const kind = confirmKind
    setConfirmKind(null)
    switch (kind) {
      case 'tunnel-on':
        if (startBlocked) return
        onStart(project.path)
        break
      case 'tunnel-off':
        onStop(project.path)
        break
      case 'dev-on':
        onStartDev(project.path)
        break
      case 'dev-off':
        onStopDev(project.path)
        break
      case 'hide':
        onToggleHidden(project, true)
        break
    }
  }

  const card = (
    <article
      className={[
        'ob-project-card',
        project.active ? 'is-active' : '',
        project.state === 'error' ? 'is-error' : '',
        project.favorite ? 'is-favorite' : '',
        selected ? 'is-selected' : '',
        compact ? 'is-compact' : '',
        live ? 'is-live' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={
        onOpen
          ? (event) => {
              const target = event.target as HTMLElement
              if (
                target.closest(
                  'button, a, input, pre, .ob-hover-toggle, .ob-live-log, .ob-confirm-root',
                )
              ) {
                return
              }
              onOpen(project)
            }
          : undefined
      }
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(project)
              }
            }
          : undefined
      }
    >
      <div className="ob-project-top">
        <div className="ob-project-title">
          <h3 title={project.name}>
            <button
              type="button"
              className={[
                'ob-star-toggle',
                project.favorite ? 'is-on' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={busy || project.hidden}
              title={project.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
              aria-label={
                project.favorite
                  ? `${project.name} 즐겨찾기 해제`
                  : `${project.name} 즐겨찾기 추가`
              }
              aria-pressed={project.favorite}
              onClick={() => onToggleFavorite(project)}
            >
              {project.favorite ? '★' : '☆'}
            </button>
            <span className="ob-truncate">{project.name}</span>
          </h3>
          {!compact ? (
            <p className="ob-project-path" title={project.path}>
              {project.path}
            </p>
          ) : null}
        </div>
        <div className="ob-project-top-actions">
          <span className={`ob-badge ob-badge-${project.state}`}>
            {stateLabel(project.state)}
          </span>
          {!project.hidden ? (
            <button
              type="button"
              className="ob-card-dismiss"
              disabled={busy}
              title="목록에서 숨기기"
              aria-label={`${project.name} 숨기기`}
              onClick={() => requestToggle('hide')}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {project.error ? (
        <p className="ob-alert ob-alert-warn">{project.error}</p>
      ) : null}

      <div className="ob-card-footer">
        <div className="ob-runtime-inline">
          <ShinyToggleButton
            label="Tunnel"
            on={powered}
            busy={toggleBusy}
            disabled={!powered && startBlocked}
            title={
              startBlocked && !powered
                ? '다른 브리지가 실행 중이라 켤 수 없습니다'
                : undefined
            }
            onToggle={() => {
              if (powered) {
                requestToggle('tunnel-off')
                return
              }
              if (startBlocked) return
              requestToggle('tunnel-on')
            }}
          />
          <ShinyToggleButton
            label="Dev"
            on={devPowered}
            busy={devToggleBusy}
            title={project.dev?.command || undefined}
            onToggle={() => {
              if (devPowered) {
                requestToggle('dev-off')
                return
              }
              requestToggle('dev-on')
            }}
          />
          {project.dev?.url ? (
            <a
              className="ob-btn ob-btn-ghost ob-btn-sm ob-local-link"
              href={project.dev.url}
              target="_blank"
              rel="noreferrer"
              title={project.dev.url}
            >
              Local ↗
            </a>
          ) : null}
        </div>

        <div className="ob-actions ob-actions-inline">
          {project.hidden ? (
            <button
              type="button"
              className="ob-btn ob-btn-ghost ob-btn-sm"
              disabled={busy}
              onClick={() => onToggleHidden(project, false)}
            >
              복구
            </button>
          ) : null}
          {onToggleLogs && !liveLogs ? (
            <button
              type="button"
              className="ob-btn ob-btn-ghost ob-btn-sm"
              onClick={() => onToggleLogs(project)}
            >
              {showLogs ? '로그▲' : '로그'}
            </button>
          ) : null}
        </div>
      </div>

      {showLogPane ? (
        <LiveLog
          lines={project.recentLogs || []}
          live={live || liveLogs}
          onCopy={onLogCopied}
        />
      ) : null}
    </article>
  )

  return (
    <>
      <StarBorder
        active={live}
        color={project.state === 'error' ? '#e06464' : '#34c77a'}
        speed="4s"
        thickness={2}
      >
        {card}
      </StarBorder>
      {confirm ? (
        <ConfirmDialog
          open={Boolean(confirmKind)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onCancel={() => setConfirmKind(null)}
          onConfirm={runConfirm}
        />
      ) : null}
    </>
  )
}
