import { useState } from 'react'
import { BookOpenText, GitBranch, Rss, Sparkles, ArrowUpRight } from 'lucide-react'
import { GithubTrendingSection } from './github-trending-section'

const categories = [
  { id: 'github', number: '01', label: 'GitHub 트렌딩', eyebrow: 'OPEN SOURCE', description: '오늘의 인기 저장소 TOP 5와 날짜별 기록', icon: GitBranch, ready: true },
  { id: 'ai', number: '02', label: 'AI · 기술 소식', eyebrow: 'AI & TECH', description: 'AI 서비스와 개발 생태계의 주요 뉴스를 모을 예정이야.', icon: Sparkles, ready: false },
  { id: 'releases', number: '03', label: '도구 · 릴리스', eyebrow: 'RELEASE NOTES', description: '개발 도구와 오픈소스 업데이트를 모을 예정이야.', icon: Rss, ready: false },
  { id: 'blogs', number: '04', label: '개발 블로그', eyebrow: 'EDITORIAL', description: '기술 블로그와 읽을 만한 글을 모을 예정이야.', icon: BookOpenText, ready: false },
] as const
type CategoryId = typeof categories[number]['id']

export default function Feature() {
  const [category, setCategory] = useState<CategoryId>('github')
  const current = categories.find(item => item.id === category) ?? categories[0]
  const CurrentIcon = current.icon

  return <main aria-label="뉴스" className="mx-auto grid w-full max-w-6xl gap-4 pb-10">
    <nav aria-label="뉴스 카테고리" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}
        className={category === item.id
          ? 'group flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border border-primary/45 bg-primary/10 p-4 text-left shadow-[0_0_18px_color-mix(in_oklab,var(--brand-skymint)_12%,transparent)] transition-colors'
          : 'group flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border border-border/70 bg-card/70 p-4 text-left transition-colors hover:border-primary/35 hover:bg-muted/40'}>
        <div className="flex w-full items-center justify-between"><item.icon size={19} className={category === item.id ? 'text-primary' : 'text-muted-foreground transition-transform group-hover:scale-110'} /><span className="text-[10px] font-medium tracking-wider text-muted-foreground">{item.number} / 04</span></div>
        <div className="flex w-full flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.label}</span>{!item.ready && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">준비 중</span>}</div>
      </button>)}
    </nav>

    <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-[0_16px_48px_color-mix(in_oklab,var(--brand-violet)_8%,transparent)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/8 to-transparent" />
      <div className="relative min-w-0 p-4 sm:p-6">
    {category === 'github' ? <GithubTrendingSection /> :
      <section aria-label={current.label} className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/75 bg-background/35 px-6 py-12 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><CurrentIcon size={27} /></div>
        <p className="text-xs font-semibold tracking-widest text-primary">{current.eyebrow} · {current.number}</p>
        <h2 className="mt-3 text-2xl font-bold">{current.label}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{current.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">아직 연결된 뉴스 공급원이 없어. GitHub 카테고리만 실제 데이터가 제공돼.</p>
        <button type="button" onClick={() => setCategory('github')} className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm transition-colors hover:border-primary/40 hover:text-primary">GitHub 트렌딩 보기 <ArrowUpRight size={15}/></button>
      </section>}
      </div>
    </div>
  </main>
}
