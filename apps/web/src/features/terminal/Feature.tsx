import { useCallback, useEffect, useState } from 'react'
import { AppButton, AppMagicCard } from '../../components/common'
import { ownerRequest } from '../../lib/owner-api'

type Job = { id: string; command: string; status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'; createdAt: string; completedAt?: string; output?: string }
const available = [{ value: 'node-version', label: 'Node.js 버전 조회' }, { value: 'git-version', label: 'Git 버전 조회' }]

export default function Feature() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [command, setCommand] = useState('node-version')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selected, setSelected] = useState<Job | null>(null)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    try { setJobs(await ownerRequest<Job[]>('owner/cli-jobs')); setMessage('') }
    catch (error) { setMessage(error instanceof Error ? error.message : '불러오기 실패') }
    finally { setInitialLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function showDetail(id: string) {
    setLoading(true)
    try { setSelected(await ownerRequest<Job>('owner/cli-jobs/' + encodeURIComponent(id))) }
    catch (error) { setMessage(error instanceof Error ? error.message : '상세 조회 실패') }
    finally { setLoading(false) }
  }

  async function submit() {
    setLoading(true)
    try {
      await ownerRequest('owner/cli-jobs', { method: 'POST', body: { command, requestId: crypto.randomUUID() } })
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : '작업 등록 실패') }
    finally { setLoading(false) }
  }

  async function cancel(id: string) {
    setLoading(true)
    try { await ownerRequest('owner/cli-jobs/' + id + '/cancel', { method: 'POST' }); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : '취소 실패') }
    finally { setLoading(false) }
  }

  return (
    <section aria-label="원격 CLI" className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold text-foreground">원격 CLI</h1>
        <p className="text-sm text-muted-foreground">안전한 읽기 전용 작업 등록 단계입니다. 실제 Mac 명령 실행은 아직 연결되지 않았습니다.</p>
      </div>
      <AppMagicCard className="rounded-2xl">
        <div className="grid gap-4 p-5 sm:p-6">
          <h2 className="font-semibold">작업 등록</h2>
          <label className="grid gap-2 text-sm text-muted-foreground">허용된 명령
            <select className="w-full rounded-lg border border-border bg-background p-3 text-foreground" value={command} onChange={event => setCommand(event.target.value)}>
              {available.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <AppButton onClick={() => void submit()} disabled={loading}>{loading ? '처리 중…' : '대기 작업 등록'}</AppButton>
            <span className="text-xs text-muted-foreground">작업은 서버에 대기 상태로만 등록되며 자동 실행되지 않습니다.</span>
          </div>
        </div>
      </AppMagicCard>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">작업 이력</h2>
          <AppButton variant="outline" onClick={() => void load()} disabled={loading}>새로고침</AppButton>
        </div>
        {message && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
        {initialLoading && <p role="status" className="text-sm text-muted-foreground">작업 이력을 불러오는 중…</p>}
        {!initialLoading && jobs.length === 0 ? <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">등록된 작업이 없습니다.</p> : jobs.map(job => (
          <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 p-4">
            <div className="grid gap-1">
              <p className="font-medium text-foreground">{available.find(item => item.value === job.command)?.label ?? job.command}</p>
              <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()} · {job.status}</p>
              {job.output && <p className="text-sm text-muted-foreground">{job.output}</p>}
            </div>
            <div className="flex gap-2"><AppButton variant="outline" disabled={loading} onClick={() => void showDetail(job.id)}>상세</AppButton>
            {job.status === 'pending' && <AppButton variant="outline" disabled={loading} onClick={() => void cancel(job.id)}>대기 취소</AppButton>}</div>
          </div>
        ))}
      </div>
      {selected && <div role="dialog" aria-modal="true" aria-label="작업 상세" className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">작업 상세</h2><AppButton variant="outline" onClick={() => setSelected(null)}>닫기</AppButton></div>
        <p className="mt-2 break-all text-xs text-muted-foreground">{selected.id} · {selected.status}</p>
        <p className="mt-2 text-sm">{selected.command}</p>
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all text-xs">{selected.output ?? '실행 결과 없음 · 대기 등록 단계'}</pre>
      </div>}
    </section>
  )
}
