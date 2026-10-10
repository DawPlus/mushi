import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { registrations, loaders } from 'virtual:mushi-remote-routes'

function RemoteFailure({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-border p-6">
    외부 프로젝트 화면을 불러올 수 없습니다. 다른 Mushi 기능은 계속 사용할 수 있습니다.
    <button type="button" className="ml-3 underline" onClick={onRetry}>다시 시도</button>
    <Link className="ml-3 underline" to="/">홈으로</Link>
  </div>
}

class RemoteBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <RemoteFailure onRetry={this.props.onRetry} />
    return this.props.children
  }
}

const componentCache = new Map<string, ReturnType<typeof lazy>>()
function componentFor(id: string, importer: () => Promise<{ default?: import('react').ComponentType }>) {
  const cached = componentCache.get(id)
  if (cached) return cached
  const component = lazy(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Remote load timeout')), 8000)
    })
    let mod: { default?: import('react').ComponentType }
    try { mod = await Promise.race([importer(), timeout]) }
    finally { clearTimeout(timer) }
    if (!mod.default || (typeof mod.default !== 'function' && typeof mod.default !== 'object')) throw new Error('Invalid remote component')
    return { default: mod.default }
  })
  componentCache.set(id, component)
  return component
}

function RemoteContent({ Remote, onReady }: { Remote: ReturnType<typeof lazy>; onReady: () => void }) {
  useEffect(() => { onReady() }, [onReady])
  return <Remote />
}

function ExternalRemote() {
  const { remoteId } = Route.useParams()
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setExpired(true), 8000)
    return () => clearTimeout(timer)
  }, [attempt, ready])
  const registration = registrations.find(item => item.id === remoteId && item.route === '/ext/' + remoteId)
  const importer = registration ? loaders[registration.id] : undefined
  if (!registration || !importer) return <p role="status">등록되지 않은 외부 프로젝트입니다.</p>
  const Remote = componentFor(registration.id, importer)
  function retry() {
    componentCache.delete(registration!.id)
    setReady(false)
    setExpired(false)
    setAttempt(value => value + 1)
  }
  if (expired) return <section aria-label={registration.label}><RemoteFailure onRetry={retry} /></section>
  return <section aria-label={registration.label}>
    <RemoteBoundary key={`${remoteId}:${attempt}`} onRetry={retry}>
      <Suspense fallback={<p role="status">외부 프로젝트를 불러오는 중…</p>}>
        <RemoteContent Remote={Remote} onReady={() => setReady(true)} />
      </Suspense>
    </RemoteBoundary>
  </section>
}

export const Route = createFileRoute('/ext/$remoteId')({ component: ExternalRemote })
