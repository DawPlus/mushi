import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownerRequest } from '../../lib/owner-api'

type Bot = { id: string; name: string; backend: string; model: string; kind: string; status: string; activity: string }
type Entry = { id: string; kind: string; text: string; status: string; options: { optionId?: string; id?: string; label?: string; name?: string }[] }

export default function Feature() {
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const cache = useQueryClient()
  const bots = useQuery({
    queryKey: ['owner', 'codync', 'bots'],
    queryFn: () => ownerRequest<{ bots: Bot[] }>('/owner/codync/bots'),
    retry: false, refetchInterval: 10000,
  })
  const history = useQuery({
    queryKey: ['owner', 'codync', 'history', selected],
    queryFn: () => ownerRequest<{ entries: Entry[] }>(`/owner/codync/bots/${encodeURIComponent(selected!)}/history`),
    enabled: !!selected, retry: false, refetchInterval: 5000,
  })
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => ownerRequest(path, { method: 'POST', body }),
    onSuccess: () => {
      setNotice('')
      void cache.invalidateQueries({ queryKey: ['owner', 'codync'] })
    },
    onError: () => setNotice('요청을 처리하지 못했습니다. Codync 연결과 권한을 확인해 주세요.'),
  })
  const current = bots.data?.bots.find(bot => bot.id === selected)
  const send = () => {
    if (!selected || !message.trim() || action.isPending) return
    action.mutate({ path: `/owner/codync/bots/${encodeURIComponent(selected)}/send`, body: { text: message.trim() } }, { onSuccess: () => setMessage('') })
  }
  return (
    <section aria-label="Agents" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-foreground">Agents</h1><p className="text-sm text-muted-foreground">Codync 에이전트 및 채팅</p></div>
        <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent" onClick={() => void cache.invalidateQueries({ queryKey: ['owner', 'codync'] })}>새로고침</button>
      </div>
      {bots.isPending && <p role="status">에이전트 불러오는 중…</p>}
      {bots.error && <p role="alert" className="text-destructive">Codync 에이전트를 불러오지 못했습니다. Owner 로그인 및 Host 상태를 확인해 주세요.</p>}
      {notice && <p role="alert" className="text-destructive">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,2fr)]">
        <ul aria-label="에이전트 목록" className="grid content-start gap-2">
          {bots.data?.bots.map(bot => (
            <li key={bot.id}>
              <button type="button" onClick={() => { setSelected(bot.id); setNotice('') }}
                aria-pressed={selected === bot.id}
                className={`w-full rounded-xl border p-4 text-left hover:bg-accent ${selected === bot.id ? 'border-primary bg-accent' : 'border-border bg-card'}`}>
                <span className="flex items-center justify-between gap-2"><strong className="text-sm">{bot.name}</strong><span className="text-xs text-muted-foreground">{bot.status}</span></span>
                <span className="mt-1 block text-xs text-muted-foreground">{bot.backend}{bot.model ? ` · ${bot.model}` : ''}{bot.kind === 'group' ? ' · 그룹' : ''}</span>
                {bot.activity && <span className="mt-1 block text-xs text-muted-foreground">{bot.activity}</span>}
              </button>
            </li>
          ))}
          {bots.data?.bots.length === 0 && <li className="text-sm text-muted-foreground">등록된 에이전트가 없습니다.</li>}
        </ul>
        <div className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
          {current ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                <strong>{current.name}</strong>
                <button type="button" disabled={action.isPending} onClick={() => {
                  if (window.confirm(`${current.name}의 현재 작업을 중단할까요?`))
                    action.mutate({ path: `/owner/codync/bots/${encodeURIComponent(current.id)}/stop` })
                }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">작업 중단</button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-label="채팅 기록">
                {history.isPending && <p className="text-sm text-muted-foreground">대화 불러오는 중…</p>}
                {history.error && <p role="alert" className="text-sm text-destructive">대화 조회에 실패했습니다.</p>}
                {history.data?.entries.map(entry => (
                  <div key={entry.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="mb-1 text-xs text-muted-foreground">{entry.kind}{entry.status ? ` · ${entry.status}` : ''}</p>
                    {entry.text && <p className="whitespace-pre-wrap break-words">{entry.text}</p>}
                    {entry.options?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.options.map(option => {
                          const id = option.optionId || option.id
                          return id ? <button key={id} type="button" disabled={action.isPending}
                            onClick={() => { if (window.confirm(`승인 응답: ${option.label || option.name || id}?`)) action.mutate({ path: `/owner/codync/permissions/${encodeURIComponent(entry.id)}/respond`, body: { optionId: id } }) }}
                            className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent">{option.label || option.name || id}</button> : null
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {history.data?.entries.length === 0 && <p className="text-sm text-muted-foreground">아직 대화가 없습니다.</p>}
              </div>
              <form className="flex gap-2 border-t border-border p-3" onSubmit={e => { e.preventDefault(); send() }}>
                <input aria-label="에이전트에게 보낼 메시지" value={message} maxLength={10000} onChange={e => setMessage(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="에이전트에게 작업 지시…" />
                <button type="submit" disabled={!message.trim() || action.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">전송</button>
              </form>
            </>
          ) : <p className="p-6 text-sm text-muted-foreground">왼쪽에서 에이전트를 선택해 주세요.</p>}
        </div>
      </div>
    </section>
  )
}
