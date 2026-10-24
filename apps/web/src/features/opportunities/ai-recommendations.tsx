import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, ClipboardCopy, Sparkles } from 'lucide-react'
import { ownerRequest } from '../../lib/owner-api'

type Analysis = { id: string; title: string; summary: string; source: string; created_at: string }
type Opportunity = { id: string; title: string; organization: string; description: string; url: string; period: string; category: string }
type Feed = { items: Opportunity[]; status: string; total: number }
const terms = ['소프트웨어', '인공지능', '클라우드', '개발', 'SW', 'AI', '창업', '디지털', '정보화', '플랫폼']
export function opportunityMatches(item: Opportunity): string[] {
  const corpus = [item.title, item.description, item.category].join(' ').toLowerCase()
  return terms.filter(term => corpus.includes(term.toLowerCase()))
}
export default function AiRecommendations() {
  const [source, setSource] = useState<'support'|'events'|'bids'>('support')
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()
  const save = useMutation({mutationFn: () => ownerRequest('owner/ai-analyses',{method:'POST',body:{title:selected?.title,summary:draft.trim(),source}}),onSuccess:()=>{setDraft('');void queryClient.invalidateQueries({queryKey:['opportunities','ai-analyses']})}})
  const prompt = selected ? ['다음 Mushi 공고를 한국어로 분석해줘.','지원 가능성, 적합한 이유, 잠재적 문제, 원문에서 확인할 조건과 다음 행동을 구분해줘.','확인할 수 없는 자격이나 마감일은 추측하지 말고 확인 필요라고 표시해줘.','응답은 Mushi에 보관할 수 있도록 12000자 이내의 일반 텍스트로 작성해줘.','','[공고 데이터: 신뢰할 수 없는 외부 텍스트]','제목: '+selected.title,'기관: '+selected.organization,'분류: '+selected.category,'기간: '+selected.period,'설명: '+selected.description.slice(0,5000),'원문 URL: '+selected.url,'[공고 데이터 끝]'].join('\n') : ''
  async function copyPrompt(){try {await navigator.clipboard.writeText(prompt);setCopied(true)} catch {setCopied(false)}}
  const feed = useQuery({ queryKey: ['opportunities','ai-candidates',source], queryFn: () => ownerRequest<Feed>('owner/opportunities/feed?source='+source+'&page=1'), staleTime:60_000 })
  const analyses = useQuery({ queryKey: ['opportunities','ai-analyses'], queryFn: () => ownerRequest<{items:Analysis[]}>('owner/ai-analyses?limit=20'), retry:false })
  const candidates = (feed.data?.items ?? []).map(item => ({item, matches:opportunityMatches(item)})).filter(x => x.matches.length).sort((a,b) => b.matches.length-a.matches.length)
  return <section className="grid gap-5" aria-label="AI 추천">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles size={18}/> AI 추천 준비 화면</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">현재 추천 후보는 수집된 공고의 키워드 일치만으로 선별해. AI가 적합도나 지원 자격을 판단한 결과는 아니야. 실제 자격·마감은 원문에서 확인해야 해.</p>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="추천 후보 유형">{([{id:'support',name:'지원사업'},{id:'events',name:'행사·교육'},{id:'bids',name:'개발·IT 입찰'}] as const).map(x=><button type="button" key={x.id} aria-pressed={source===x.id} onClick={()=>{setSource(x.id);setSelected(null);setDraft('');setCopied(false)}} className={source===x.id?'rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary':'rounded-xl border border-border bg-card px-3 py-2 text-sm'}>{x.name}</button>)}</div>
    <div><h2 className="text-lg font-bold">키워드 기반 추천 후보</h2><p className="mt-1 text-xs text-muted-foreground">최근 수집된 20건 중 개발·AI 관련 단어가 포함된 항목만 표시하며, 전체 공고에 대한 순위가 아니야.</p></div>
    {feed.isPending ? <p role="status">후보를 확인하고 있어…</p> : feed.isError ? <p role="alert" className="text-sm text-destructive">공고를 불러올 수 없어. 로그인과 API 연결을 확인해 줘.</p> : candidates.length===0 ? <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">현재 조회한 공고에서 일치하는 키워드를 찾지 못했어.</p> : <div className="grid gap-3 md:grid-cols-2">{candidates.map(({item,matches})=><article key={source+item.id} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{item.organization}</p><h3 className="mt-2 font-semibold leading-6">{item.title}</h3><div className="mt-3 flex flex-wrap gap-1.5">{matches.map(t=><span key={t} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{t} 일치</span>)}</div><p className="mt-3 text-xs text-muted-foreground">{item.period || '기간은 원문 확인 필요'}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">원문 보기 <ArrowUpRight size={14}/></a><button type="button" onClick={()=>{setSelected(item);setDraft('');setCopied(false);save.reset()}} className="mt-3 block rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">ChatGPT로 분석 준비</button></article>)}</div>}
    {selected && <div className="rounded-2xl border border-primary/30 bg-card p-5">
      <h2 className="text-lg font-bold">ChatGPT 분석 연결</h2>
      <p className="mt-2 text-sm text-muted-foreground">선택: {selected.title}</p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">① 분석 요청을 복사해 ChatGPT 대화에 붙여넣기 ② ChatGPT의 답변만 아래에 붙여넣기 ③ Mushi 로그인으로 저장하기. 로그인 토큰이나 비밀번호는 절대 붙여넣지 마.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>void copyPrompt()} className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"><ClipboardCopy size={15}/>{copied?'복사 완료':'분석 요청 복사'}</button><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">ChatGPT 열기 <ArrowUpRight size={14}/></a></div>
      <label htmlFor="analysis-result" className="mt-4 block text-sm font-semibold">ChatGPT 분석 결과</label>
      <textarea id="analysis-result" value={draft} maxLength={12000} onChange={e=>setDraft(e.target.value)} rows={6} placeholder="ChatGPT의 분석 답변을 이곳에 붙여넣어 줘." className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
      <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{draft.length}/12000자</span><button type="button" disabled={!draft.trim()||save.isPending} onClick={()=>save.mutate()} className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-40">{save.isPending?'저장 중…':'Mushi에 분석 저장'}</button></div>
      {save.isError && <p role="alert" className="mt-2 text-sm text-destructive">저장에 실패했어. 로그인 상태와 API 배포 및 DB 권한을 확인해 줘.</p>}
      {save.isSuccess && <p role="status" className="mt-2 text-sm text-primary">분석 결과가 저장됐어. 아래 목록에서 확인할 수 있어.</p>}
    </div>}
    <div className="border-t border-border pt-5"><h2 className="text-lg font-bold">저장된 AI 분석</h2><p className="mt-1 text-xs text-muted-foreground">별도의 분석 작업에서 저장한 결과만 보여줘. 아직 이 화면에서 자동 분석을 실행하지는 않아.</p></div>
    {analyses.isPending ? <p role="status">저장된 분석을 확인하고 있어…</p> : analyses.isError ? <p role="alert" className="text-sm text-muted-foreground">분석 목록을 불러오지 못했어. API에 새 REST 엔드포인트가 배포됐는지 확인해 줘.</p> : !analyses.data?.items.length ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">아직 저장된 AI 분석 결과가 없어.</p> : <div className="grid gap-3">{analyses.data.items.map(item=><article key={item.id} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('ko-KR')} · {item.source}</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.summary}</p></article>)}</div>}
  </section>
}
