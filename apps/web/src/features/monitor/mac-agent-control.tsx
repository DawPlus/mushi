import { useEffect, useState } from 'react'
import { getOwnerAccessToken } from '../system/owner-login'

type AgentState = { installed: boolean; running: boolean }
const endpoint = 'http://127.0.0.1:3000/owner/mac-agent'

async function agentRequest(action?: 'start' | 'stop'): Promise<AgentState> {
  const token = await getOwnerAccessToken()
  if (!token) throw new Error('로그인이 필요합니다.')
  const response = await fetch(endpoint + (action ? '/' + action : '/status'), {
    method: action ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!response.ok) throw new Error('로컬 Mac Agent 제어 API에 접근할 수 없습니다.')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || typeof (body as AgentState).installed !== 'boolean' ||
      typeof (body as AgentState).running !== 'boolean') throw new Error('잘못된 Agent 응답')
  return body as AgentState
}

export function MacAgentControl() {
  const [state, setState] = useState<AgentState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() {
    try { setState(await agentRequest()); setError('') }
    catch { setError('로컬 Mac API 연결을 확인해 주세요.') }
  }
  useEffect(() => { void refresh() }, [])
  async function toggle() {
    if (!state || busy || !state.installed) return
    const action = state.running ? 'stop' : 'start'
    if (!window.confirm(action === 'stop' ? 'Mac Agent 모니터링을 중지할까요?' : 'Mac Agent 모니터링을 시작할까요?')) return
    setBusy(true)
    try { setState(await agentRequest(action)); setError('') }
    catch { setError('상태 변경에 실패했습니다. 로컬 API와 launchd 상태를 확인해 주세요.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-2xl border border-border bg-card p-5" aria-label="Mac Agent 제어">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-semibold">Mac Agent</h2>
        <p className="text-sm text-muted-foreground">{state ? (state.running ? '실행 중 · 상태 자동 전송' : state.installed ? '중지됨' : 'launchd 미등록') : '상태 확인 중'}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void refresh()} disabled={busy}>새로고침</button>
        <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={() => void toggle()} disabled={!state?.installed || busy}>{busy ? '처리 중…' : state?.running ? '끄기' : '켜기'}</button>
      </div>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    <p className="mt-2 text-xs text-muted-foreground">이 Mac의 로컬 API에서만 제어할 수 있습니다. 원격 배포 화면에서는 동작하지 않습니다.</p>
  </section>
}
