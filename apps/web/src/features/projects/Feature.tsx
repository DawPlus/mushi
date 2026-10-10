import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AppButton, AppMagicCard } from '../../components/common'
import { ownerRequest } from '../../lib/owner-api'

type Project = { id: string; label: string; remoteEntry: string; enabled: boolean }

export default function Feature() {
  const [items, setItems] = useState<Project[]>([])
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [remoteEntry, setRemoteEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try { setItems(await ownerRequest<Project[]>('owner/projects')); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : '불러오기 실패') }
    finally { setInitialLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await ownerRequest('owner/projects', { method: 'POST', body: { id, label, remoteEntry, enabled: false } })
      setId(''); setLabel(''); setRemoteEntry('')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : '등록 실패') }
    finally { setBusy(false) }
  }
  async function remove(projectId: string) {
    setBusy(true)
    try { await ownerRequest('owner/projects/' + projectId + '/remove', { method: 'POST' }); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : '해제 실패') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label="외부 프로젝트" className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground">외부 프로젝트의 연결 정보만 관리합니다. 실제 모듈 로딩은 아직 비활성화돼 있습니다.</p>
      </div>
      <AppMagicCard className="rounded-2xl">
        <form onSubmit={event => void register(event)} className="grid gap-4 p-5 sm:p-6">
          <h2 className="font-semibold">프로젝트 등록</h2>
          <label className="grid gap-1.5 text-sm text-muted-foreground">프로젝트 ID
            <input required pattern="[a-z][a-z0-9-]{1,39}" maxLength={40} value={id} onChange={e => setId(e.target.value)} placeholder="my-project" className="rounded-lg border border-border bg-background p-3 text-foreground" />
          </label>
          <label className="grid gap-1.5 text-sm text-muted-foreground">프로젝트 이름
            <input required maxLength={60} value={label} onChange={e => setLabel(e.target.value)} placeholder="My Project" className="rounded-lg border border-border bg-background p-3 text-foreground" />
          </label>
          <label className="grid gap-1.5 text-sm text-muted-foreground">프로젝트 URL
            <input required type="url" value={remoteEntry} onChange={e => setRemoteEntry(e.target.value)} placeholder="http://127.0.0.1:3847/" className="rounded-lg border border-border bg-background p-3 text-foreground" />
          </label>
          <p className="text-xs text-muted-foreground">로컬 주소는 바로 등록할 수 있어요. 외부 HTTPS 주소는 서버의 허용 출처 설정이 필요해요. 등록만으로 코드를 실행하지 않습니다.</p>
          <div><AppButton type="submit" disabled={busy}>{busy ? '처리 중…' : '연결 정보 등록'}</AppButton></div>
        </form>
      </AppMagicCard>
      <div className="grid gap-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">등록된 프로젝트</h2><AppButton variant="outline" disabled={busy} onClick={() => void refresh()}>새로고침</AppButton></div>
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {initialLoading && <p role="status" className="text-sm text-muted-foreground">프로젝트를 불러오는 중…</p>}
        {!initialLoading && items.length === 0 ? <p className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p> : items.map(item => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 p-4">
            <div className="grid min-w-0 gap-1">
              <p className="font-medium">{item.label} <span className="text-xs text-muted-foreground">({item.id})</span></p>
              <p className="break-all text-xs text-muted-foreground">{item.remoteEntry}</p>
              <p className="text-xs text-muted-foreground">비활성 · 메타데이터만 등록됨</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={item.remoteEntry} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" aria-label={`${item.label} 새 탭에서 열기`}>열기 ↗</a>
              <AppButton variant="outline" disabled={busy} onClick={() => void remove(item.id)}>등록 해제</AppButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
