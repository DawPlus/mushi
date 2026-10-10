import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api, type WorkspaceRoot } from '../lib/api'
import { AnimatedItem, AnimatedList } from './AnimatedList'
import { DecryptedText } from './DecryptedText'
import { KineticText } from './KineticText'
import { workspaceBasename } from '../lib/activeWorkspace'

type WorkspacePickerProps = {
  roots: WorkspaceRoot[]
  busyPath: string | null
  message: string | null
  onSelect: (root: WorkspaceRoot) => void
  onAdded: (roots: WorkspaceRoot[], selected: WorkspaceRoot) => void
  onRemove: (path: string) => void
  onMessage: (message: string | null) => void
  onBusy: (path: string | null) => void
}

export function WorkspacePicker({
  roots,
  busyPath,
  message,
  onSelect,
  onAdded,
  onRemove,
  onMessage,
  onBusy,
}: WorkspacePickerProps) {
  const [manualPath, setManualPath] = useState('')
  const [adding, setAdding] = useState(false)

  async function onBrowse() {
    onMessage(null)
    try {
      const result = await api.browseFolder()
      if ('unsupported' in result && result.unsupported) {
        onMessage(`${result.error} 아래 경로를 직접 입력하세요.`)
        return
      }
      if (result.cancelled || !result.path) return
      setManualPath(result.path)
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error))
    }
  }

  async function onAdd() {
    const path = manualPath.trim()
    if (!path) {
      onMessage('상위 workspace 폴더 경로를 입력하거나 찾아보세요.')
      return
    }
    setAdding(true)
    onMessage(null)
    try {
      const result = await api.addProject(path)
      const nextRoots = result.roots || []
      const selected =
        nextRoots.find((root) => root.path === path) || {
          path,
          name: workspaceBasename(path),
        }
      setManualPath('')
      onAdded(nextRoots, selected)
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="ob-page ob-picker-page">
      <section className="ob-hero">
        <KineticText text="Workspace" className="ob-hero-kinetic" />
        <p className="ob-hero-sub">
          <DecryptedText
            text="select a root · then control packages"
            animateOn="view"
            className="ob-hero-decrypt"
          />
        </p>
        <p>
          제어할 상위 workspace를 하나 선택하세요. 바로 아래(1-depth){' '}
          <code>package.json</code> 폴더만 메인에 표시됩니다.
        </p>
      </section>

      <section className="ob-card" aria-labelledby="pick-add-heading">
        <div className="ob-card-head">
          <h2 id="pick-add-heading" className="ob-card-title">
            새 workspace
          </h2>
        </div>
        <div className="ob-add-row">
          <div className="ob-field">
            <label className="ob-label" htmlFor="picker-path">
              상위 폴더 경로
            </label>
            <input
              id="picker-path"
              className="ob-input"
              value={manualPath}
              placeholder="/Users/you/workspace"
              onChange={(event) => setManualPath(event.target.value)}
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            className="ob-btn ob-btn-ghost"
            onClick={() => void onBrowse()}
            disabled={adding}
          >
            찾아보기…
          </button>
          <button
            type="button"
            className="ob-btn ob-btn-primary"
            onClick={() => void onAdd()}
            disabled={adding || !manualPath.trim()}
          >
            {adding ? '추가 중…' : '추가 후 열기'}
          </button>
        </div>
        <p className="ob-hint">
          Tunnel 설정은 <Link to="/settings">설정</Link>에서. 등록된 workspace는
          아래에서 다시 고를 수 있습니다.
        </p>
        {message ? <p className="ob-alert ob-alert-warn">{message}</p> : null}
      </section>

      <section className="ob-section" aria-labelledby="pick-list-heading">
        <div className="ob-section-head">
          <h2 id="pick-list-heading" className="ob-section-title">
            등록된 workspace
          </h2>
          <span className="ob-section-count">{roots.length}</span>
        </div>
        {roots.length === 0 ? (
          <div className="ob-empty">아직 등록된 workspace가 없습니다.</div>
        ) : (
          <AnimatedList className="ob-workspace-grid">
            {roots.map((root, index) => (
              <AnimatedItem
                key={root.path}
                index={index}
                delay={Math.min(index * 0.05, 0.3)}
              >
                <article className="ob-workspace-card">
                  <div className="ob-workspace-card-body">
                    <h3>
                      <DecryptedText text={root.name} animateOn="view" />
                    </h3>
                    <p>{root.path}</p>
                  </div>
                  <div className="ob-actions">
                    <button
                      type="button"
                      className="ob-btn ob-btn-primary"
                      onClick={() => onSelect(root)}
                    >
                      선택
                    </button>
                    <button
                      type="button"
                      className="ob-btn ob-btn-ghost"
                      disabled={busyPath === root.path}
                      onClick={() => {
                        onBusy(root.path)
                        onRemove(root.path)
                      }}
                    >
                      제거
                    </button>
                  </div>
                </article>
              </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </section>
    </div>
  )
}
