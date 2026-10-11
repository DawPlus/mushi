import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { NotebookPen, ArrowUpRight, Activity } from 'lucide-react'
import { AppBlurFade } from '../../components/common'
import { createHomeGreeting } from './home-greetings'

export function BentoHome() {
  const [greeting] = useState(() => createHomeGreeting())
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"><Activity size={14}/> Mushi Workspace</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">{greeting.title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{greeting.body}</p>
            </div>
            <img src="/asset/images.jpg" alt="무시" className="size-36 rounded-2xl border border-border object-cover" />
          </div>
        </header>
      </AppBlurFade>
      <section aria-label="작업 공간" className="grid gap-3">
        <h2 className="text-lg font-semibold">작업 공간</h2>
        <Link to="/notes" className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/75 p-5 transition-colors hover:border-primary/50">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-primary/10 p-3 text-primary"><NotebookPen size={24} /></span>
            <div><h3 className="font-semibold">게시판 / 메모</h3><p className="mt-1 text-sm text-muted-foreground">개발 기록, 개인 메모, 게시글을 한곳에서 관리해.</p></div>
          </div>
          <ArrowUpRight size={19} className="text-muted-foreground group-hover:text-primary" />
        </Link>
      </section>
    </div>
  )
}
