import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { ComponentType, Ref } from 'react'
import { ArrowRight, ArrowUpRight, Lock } from 'lucide-react'
import { ActivityIcon as AnimatedActivity, FolderGit2Icon as AnimatedFolder, TerminalIcon as AnimatedTerminal, WorkflowIcon as AnimatedWorkflow, WaypointsIcon as AnimatedWaypoints, RadioIcon as AnimatedRadio, SparklesIcon as AnimatedSparkles } from 'lucide-animated'
import { ActivityIcon, AppBlurFade } from '../../components/common'
import { ApiStatus } from './api-status'
import { createHomeGreeting } from './home-greetings'
import { menuRegistry } from './menu-registry'
import { StatusSummary } from './status-summary'

const modules: Record<string, { eyebrow: string; description: string; kind: 'live' | 'staging' | 'planned'; tone: string }> = {
  monitor: { eyebrow: 'LIVE TELEMETRY', description: 'Mac의 리소스와 연결 상태를 한눈에 확인해.', kind: 'live', tone: 'text-primary' },
  terminal: { eyebrow: 'COMMAND QUEUE', description: '안전한 읽기 전용 작업을 등록하고 이력을 확인해.', kind: 'staging', tone: 'text-chart-2' },
  projects: { eyebrow: 'WORKSPACE', description: '로컬 프로젝트를 등록하고 한곳에서 찾아봐.', kind: 'live', tone: 'text-chart-3' },
  agents: { eyebrow: 'AI WORKSPACE', description: '에이전트와 개발 작업을 연결하는 공간.', kind: 'staging', tone: 'text-chart-2' },
  automation: { eyebrow: 'AUTOMATION', description: '자동화 워크플로를 확인하고 관리하는 공간.', kind: 'staging', tone: 'text-chart-4' },
  bridge: { eyebrow: 'CONNECTIVITY', description: 'Bridge 워크스페이스를 선택하고 시작·중지해.', kind: 'live', tone: 'text-primary' },
  services: { eyebrow: 'SERVICES', description: '로컬 서비스와 개발 프로세스 관리.', kind: 'planned', tone: 'text-muted-foreground' },
}

type IconHandle = { startAnimation: () => void; stopAnimation: () => void }
type AnimatedIcon = ComponentType<{ size?: number; animateOnHover?: boolean; ref?: Ref<IconHandle> }>
const animatedIcons: Record<string, AnimatedIcon> = {
  monitor: AnimatedActivity,
  terminal: AnimatedTerminal,
  projects: AnimatedFolder,
  agents: AnimatedWorkflow,
  automation: AnimatedWaypoints,
  bridge: AnimatedRadio,
  services: AnimatedActivity,
}
function ModuleIcon({ id }: { id: string }) {
  const iconRef = useRef<IconHandle>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    iconRef.current?.startAnimation()
    const timer = window.setInterval(() => iconRef.current?.startAnimation(), 3400)
    return () => { window.clearInterval(timer); iconRef.current?.stopAnimation() }
  }, [])
  const Icon = animatedIcons[id] ?? AnimatedActivity
  return <Icon ref={iconRef} size={22} animateOnHover={false} />
}

export function BentoHome() {
  const [greeting] = useState(() => createHomeGreeting())
  const priority = ['monitor', 'terminal', 'projects', 'agents', 'automation', 'bridge', 'services']
  const items = menuRegistry.filter(item => item.id !== 'dashboard')
    .sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id))
  const available = items.filter(item => item.ready)
  const upcoming = items.filter(item => !item.ready)

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-7 pb-6">
      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-3xl border border-border/65 bg-card/65 px-5 py-5 shadow-sm backdrop-blur-xl sm:px-7 sm:py-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-36 size-80 rounded-full bg-primary/10 blur-3xl dark:bg-primary/8" />
          <div aria-hidden="true" className="pointer-events-none absolute right-20 top-0 size-56 rounded-full bg-chart-2/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                <AnimatedSparkles size={14} animateOnHover={false} className="mushi-icon-float" aria-hidden="true" />
                Personal Command Center
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">{greeting.title}</h1>
              <p className="mt-1.5 max-w-lg text-sm leading-5 text-muted-foreground sm:text-base">
                {greeting.body}
              </p>
              <div className="mt-4 rounded-xl border border-border/70 bg-background/60 px-3 py-2 shadow-sm backdrop-blur-sm sm:w-fit">
                <ApiStatus />
              </div>
            </div>
            <div className="relative mx-auto sm:mx-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-primary/15 blur-2xl dark:bg-primary/10"
              />
              <figure className="relative overflow-hidden rounded-3xl border border-border/70 bg-[color-mix(in_oklab,var(--brand-surface)_88%,black)] p-1.5 shadow-lg shadow-primary/10">
                <div className="overflow-hidden rounded-[1.35rem] bg-card/40">
                  <img
                    src="/asset/images.jpg"
                    alt="무시"
                    width={447}
                    height={447}
                    className="size-36 object-cover object-center sm:size-44"
                  />
                </div>
                <figcaption className="px-2 pb-1.5 pt-2 text-center font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                  무시
                </figcaption>
              </figure>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Workspace overview</span>
            <span className="text-xs text-muted-foreground">{available.length}개 작업 공간 사용 가능</span>
          </div>
        </header>
      </AppBlurFade>

      <div className="grid gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-primary uppercase">01 / System</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">실시간 상태</h2>
          </div>
          <Link to="/monitor" className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
            Monitor 열기 <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <AppBlurFade delay={0.04} direction="up" inView><StatusSummary /></AppBlurFade>
      </div>

      <section aria-label="작업 공간" className="grid gap-4">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-primary uppercase">02 / Workspace</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">바로가기</h2>
          </div>
          <p className="text-xs text-muted-foreground">자주 사용하는 기능으로 빠르게 이동</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((item, index) => {
            const info = modules[item.id] ?? { eyebrow: 'WORKSPACE', description: '', kind: 'live' as const, tone: 'text-primary' }
            return (
              <AppBlurFade key={item.id} delay={0.05 + index * 0.025} direction="up" inView className="h-full">
                <Link to={item.href} className="group relative flex h-full min-h-48 flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:bg-card hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-colors group-hover:via-primary/50" />
                  <div className="flex items-start justify-between">
                    <span className={`flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/65 ${info.tone} transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none`}>
                      <ModuleIcon id={item.id} />
                    </span>
                    <ArrowUpRight size={18} className="text-muted-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true" />
                  </div>
                  <div className="mt-7">
                    <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">{info.eyebrow}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.label}</h3>
                      {info.kind === 'staging' && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">준비 단계</span>}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{info.description}</p>
                  </div>
                </Link>
              </AppBlurFade>
            )
          })}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section aria-label="준비 중인 기능" className="grid gap-3">
          <div className="flex items-center gap-3 px-1">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">03 / Coming next</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map(item => (
              <div key={item.id} aria-disabled="true" className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/30 p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted/45 text-muted-foreground"><ModuleIcon id={item.id} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground/75">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{modules[item.id]?.description}</p>
                </div>
                <Lock size={14} className="shrink-0 text-muted-foreground/60" aria-label="릴리스 예정" />
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground/70">
        <ActivityIcon size={13} />
        <span>Mushi Workspace</span>
        <ArrowRight size={12} aria-hidden="true" />
        <span>Build, monitor, connect.</span>
      </div>
    </div>
  )
}
