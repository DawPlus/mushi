import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useReducedMotion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, GitBranch, RefreshCw, Star, Code2, CalendarDays, Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppButton } from '../../components/common'
import { SpotlightCard } from './spotlight-card'
import './news-effects.css'

type TrendingRepo = {
  rank: number
  name: string
  url: string
  description: string
  koreanDescription?: string
  language: string
  starsToday: number | null
  starsTotal?: number | null
  forksTotal?: number | null
}
type TrendingResponse = { items: TrendingRepo[]; date: string; source: string; collected: boolean }
const seoulDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function shiftDate(date: string, amount: number) {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + amount)
  return d.toISOString().slice(0, 10)
}
const validRepoLink = (name: string, url: string) =>
  /^[\w.-]+\/[\w.-]+$/.test(name) && url === 'https://github.com/' + name

async function fetchTrending(date: string): Promise<TrendingResponse> {
  const url = new URL('/public/github-trending', apiBase)
  url.searchParams.set('date', date)
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
  if (!response.ok) throw new Error('GitHub Trending HTTP ' + response.status)
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('items' in payload) || !Array.isArray(payload.items)) throw new Error('잘못된 데이터')
  return payload as TrendingResponse
}

function RepoCard({ repo, featured, showOriginal, maxStars }: { repo: TrendingRepo; featured: boolean; showOriginal: boolean; maxStars: number }) {
  if (!validRepoLink(repo.name, repo.url)) return null
  const [owner, project] = repo.name.split('/')
  const percent = repo.starsTotal == null || maxStars === 0 ? 0 : Math.max(4, repo.starsTotal / maxStars * 100)
  return <SpotlightCard featured={featured}>
    <a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={repo.name + ' GitHub 열기'} className="relative flex h-[252px] flex-col overflow-hidden p-5">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex items-baseline gap-2"><span className={featured ? 'text-4xl font-black leading-none tracking-tighter text-primary/80' : 'text-4xl font-black leading-none tracking-tighter text-foreground/20'}>{String(repo.rank).padStart(2, '0')}</span><span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">/ TOP 05</span></div>
        <ArrowUpRight size={18} className="mt-1 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <span className="block truncate text-[11px] font-medium text-muted-foreground">{owner} <span className="mx-1 text-border">/</span> <span className="font-semibold text-primary">{repo.language || 'Open Source'}</span></span>
        <h3 className="mt-1 truncate text-[21px] font-bold tracking-tight text-foreground" title={repo.name}>{project}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.55rem] text-muted-foreground">{showOriginal ? repo.description || '설명 없음' : repo.koreanDescription || repo.description || '프로젝트 소개가 없어.'}</p>
      </div>
      <div className="mt-3 shrink-0 border-t border-border/65 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5"><Star size={13} className="text-primary" /><span className="text-sm font-bold tabular-nums">{repo.starsTotal == null ? '—' : Intl.NumberFormat('en-US',{ notation:'compact',maximumFractionDigits:1 }).format(repo.starsTotal)}</span><span className="text-[10px] text-muted-foreground">stars</span></div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><GitBranch size={12}/><span className="font-semibold tabular-nums text-foreground">{repo.forksTotal == null ? '—' : Intl.NumberFormat('en-US',{ notation:'compact',maximumFractionDigits:1 }).format(repo.forksTotal)}</span><span className="text-[10px]">forks</span></div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold tabular-nums text-primary">{repo.starsToday == null ? 'NEW' : '+' + repo.starsToday.toLocaleString()}</span>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted/80"><div className="news-metric-fill h-full rounded-full bg-primary/75" style={{ '--metric-width': percent + '%' } as React.CSSProperties} /></div>
      </div>
    </a>
  </SpotlightCard>
}

export function GithubTrendingSection() {
  const reducedMotion = useReducedMotion()
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', dragFree: false, duration: 28, watchDrag: true })
  const [activeSlide, setActiveSlide] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const updateSelection = useCallback(() => {
    if (!emblaApi) return
    setActiveSlide(emblaApi.selectedScrollSnap())
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])
  useEffect(() => {
    if (!emblaApi) return
    updateSelection()
    emblaApi.on('select', updateSelection).on('reInit', updateSelection)
    return () => { emblaApi.off('select', updateSelection).off('reInit', updateSelection) }
  }, [emblaApi, updateSelection])
  const scrollToSlide = (index: number) => emblaApi?.scrollTo(index, Boolean(reducedMotion))
  const today = seoulDate()
  const [date, setDate] = useState(today)
  const [language, setLanguage] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const trending = useQuery({
    queryKey: ['github-trending-archive', date],
    queryFn: () => fetchTrending(date),
    staleTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  const repos = trending.data?.items ?? []
  const languages = [...new Set(repos.map(repo => repo.language).filter(Boolean))]
  const filtered = language ? repos.filter(repo => repo.language === language) : repos
  const maxStars = Math.max(0, ...repos.map(repo => repo.starsTotal ?? 0))
  const switchDate = (next: string) => {
    if (next > today || !/^\d{4}-\d{2}-\d{2}$/.test(next)) return
    setDate(next)
    setLanguage('')
    emblaApi?.scrollTo(0, true)
  }

  return <section id="news-github" aria-label="GitHub 트렌딩" className="grid w-full gap-5 scroll-mt-28">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-primary"><GitBranch size={15} /> SECTION 01 · OPEN SOURCE</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">GitHub Trending <span className="text-primary">TOP 5</span></h2>
        <p className="mt-2 text-sm text-muted-foreground">오늘 주목받은 저장소와 스타·포크 기록을 살펴봐.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AppButton size="sm" variant="outline" disabled={trending.isFetching} onClick={() => void trending.refetch()}><RefreshCw size={14} className={trending.isFetching ? 'motion-safe:animate-spin' : ''} /> {date === today ? '오늘 트렌드 보기' : '기록 다시 확인'}</AppButton>
        <a className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-xs hover:border-primary/40" href="https://github.com/trending?since=daily" target="_blank" rel="noopener noreferrer">원본 보기 <ArrowUpRight size={14} /></a>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 sm:px-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={17} className="text-primary" />
        <button type="button" aria-label="이전 날짜" onClick={() => switchDate(shiftDate(date, -1))} className="rounded-lg border border-border/70 p-2 text-muted-foreground hover:bg-muted"><ChevronLeft size={17} /></button>
        <input aria-label="트렌딩 날짜" type="date" max={today} value={date} onChange={event => switchDate(event.target.value)} className="max-w-44 rounded-lg border border-border/70 bg-background px-2 py-2 text-sm font-semibold" />
        <button type="button" aria-label="다음 날짜" disabled={date >= today} onClick={() => switchDate(shiftDate(date, 1))} className="rounded-lg border border-border/70 p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronRight size={17} /></button>
        {date !== today && <button type="button" className="ml-1 text-xs font-medium text-primary hover:underline" onClick={() => switchDate(today)}>오늘</button>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Archive size={15} /> {date === today ? '오늘의 TOP 5' : '날짜별 저장 기록'}</div>
    </div>
    {!!languages.length && <div className="flex flex-wrap items-center gap-2" aria-label="언어 필터">
      <Code2 size={15} className="text-muted-foreground" />
      {['', ...languages].map(value => <button type="button" key={value} aria-pressed={value === language} onClick={() => { setLanguage(value); emblaApi?.scrollTo(0, true) }}
        className={value === language ? 'rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary' : 'rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted'}>{value || '전체'}</button>)}
      <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={() => setShowOriginal(value => !value)}>{showOriginal ? '한국어로 보기' : '영어 원문 보기'}</button>
    </div>}
    {trending.isPending && <div role="status" className="flex gap-3 overflow-hidden">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[246px] w-[300px] shrink-0 animate-pulse rounded-2xl bg-muted/60 motion-reduce:animate-none" />)}</div>}
    {trending.isError && <div role="alert" className="rounded-2xl border border-border/70 bg-card p-7">
      <p className="font-semibold">트렌딩 데이터를 불러오지 못했어.</p>
      <p className="mt-2 text-sm text-muted-foreground">서버나 Supabase 연결 상태를 확인한 뒤 다시 시도해 줘.</p>
      <AppButton size="sm" variant="outline" className="mt-4" onClick={() => void trending.refetch()}>다시 확인</AppButton>
    </div>}
    {trending.isSuccess && <div className="grid gap-3">
      {filtered.length > 1 && <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground"><span className="text-primary">{Math.min(activeSlide + 1, filtered.length).toString().padStart(2, '0')}</span><span>/</span><span>{filtered.length.toString().padStart(2, '0')}</span></div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="이전 저장소" disabled={!canPrev} onClick={() => scrollToSlide(Math.max(0, activeSlide - 1))} className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/80 text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-30"><ChevronLeft size={18}/></button>
          <button type="button" aria-label="다음 저장소" disabled={!canNext} onClick={() => scrollToSlide(Math.min(filtered.length - 1, activeSlide + 1))} className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/80 text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
      </div>}
      <div className="overflow-hidden py-3" ref={emblaRef} aria-label="GitHub 트렌딩 저장소 캐러셀" role="region" aria-roledescription="캐러셀">
        <div className="flex touch-pan-y gap-3">
          {filtered.length === 0 && <div className="w-full rounded-2xl border border-dashed border-border bg-card/60 p-9 text-center"><Archive size={26} className="mx-auto mb-3 text-muted-foreground" /><p className="font-semibold">이 날짜에는 저장된 기록이 없어.</p><p className="mt-2 text-sm text-muted-foreground">지난 날짜는 실제 수집된 기록만 볼 수 있어. 과거 순위를 임의로 만들지는 않아.</p></div>}
          {filtered.map((repo, index) => <motion.div key={repo.name} className="min-w-0 flex-[0_0_min(83vw,310px)]" initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: Math.min(index * .065, .26), ease: [.22, 1, .36, 1] }}>
            <RepoCard repo={repo} featured={repo.rank === 1} showOriginal={showOriginal} maxStars={maxStars} />
          </motion.div>)}
        </div>
      </div>
      {filtered.length > 1 && <div className="flex items-center justify-center gap-2" aria-label="캐러셀 위치">
        {filtered.map((repo, index) => <button key={repo.name} type="button" aria-label={index + 1 + '번 저장소로 이동'} aria-current={activeSlide === index ? 'true' : undefined} onClick={() => scrollToSlide(index)} className={activeSlide === index ? 'h-1.5 w-6 rounded-full bg-primary transition-all' : 'size-1.5 rounded-full bg-muted-foreground/30 transition-all hover:bg-primary/50'} />)}
      </div>}
    </div>}
    <p className="text-center text-xs text-muted-foreground">드래그·스와이프·화살표로 TOP 5 둘러보기 · GitHub Trending · Daily · 한국 날짜 기준 · Supabase에 수집된 기록을 우선 표시 · 자동 번역은 GitHub 설명 기준</p>
  </section>
}
