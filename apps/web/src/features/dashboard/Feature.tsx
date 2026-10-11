import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Bookmark,
  LayoutDashboard,
  NotebookPen,
  StickyNote,
} from 'lucide-react'
import {
  AppAuroraText,
  AppBlurFade,
  AppBorderBeam,
  AppHyperText,
  AppIconCloud,
  AppMagicCard,
  AppNumberTicker,
  AppShinyText,
  AppTypingAnimation,
  AppWordRotate,
} from '../../components/common'
import { cn } from '../../lib/utils'
import { createHomeGreeting } from '../system/home-greetings'
import { EnvStrip } from './env-strip'
import { getMoodLines } from './mood-line'

const shortcuts = [
  {
    id: 'notes',
    href: '/notes' as const,
    label: '게시판 / 메모',
    description: '개발 기록과 개인 메모를 모아 보는 공간',
    icon: NotebookPen,
    image: '/asset/koong/koong2.png',
    featured: true,
  },
  {
    id: 'bookmarks',
    href: '/bookmarks' as const,
    label: '북마크',
    description: '자주 쓰는 링크와 자료를 빠르게 열어',
    icon: Bookmark,
    image: '/asset/koong/koong4.png',
    featured: false,
  },
]

const koongImages = [
  '/asset/koong/koong1.png',
  '/asset/koong/koong2.png',
  '/asset/koong/koong3.webp',
  '/asset/koong/koong4.png',
  '/asset/koong/koong5.png',
  '/asset/koong/koong6.jpg',
  '/asset/koong/koong7.jpg',
]
const cloudImages = [...koongImages, ...koongImages, ...koongImages]

const moodLines = getMoodLines()

const pointPhrases = ['무시랑 같이 천천히', '오늘도 한 걸음', '구름 속 휴식']
const shortcutTitleWords = ['바로가기', '퀵 링크', '즐겨찾기']
const galleryCaptions = [
  ['Koong 1', '콩이', '친구'],
  ['Koong 2', '콩콩', '옆자리'],
  ['Koong 3', '콩삼', '응원'],
]

export default function Feature() {
  const [greeting] = useState(() => createHomeGreeting())

  return (
    <section aria-label="대시보드" className="mx-auto grid w-full max-w-6xl gap-6">
      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-primary/14 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-10 size-40 rounded-full bg-chart-2/12 blur-3xl" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Mushi Studio
                </span>
              </div>

              <h1 className="mt-3 font-mushi text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {greeting.title}
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <AppShinyText>{greeting.body}</AppShinyText>
              </p>

              <div className="mt-3 min-h-[1.6em]">
                <AppTypingAnimation
                  as="p"
                  words={moodLines}
                  loop
                  typeSpeed={45}
                  deleteSpeed={28}
                  pauseDelay={1600}
                  className="text-xs font-medium text-primary/90 sm:text-sm"
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link to="/notes">
                  <span className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/15">
                    <NotebookPen size={14} className="shrink-0 transition-transform group-hover:scale-105" />
                    <AppHyperText as="span" duration={700} className="text-xs font-medium">
                      메모 열기
                    </AppHyperText>
                    <ArrowUpRight size={13} className="opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </span>
                </Link>
                <Link to="/bookmarks">
                  <span className="group inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent/80">
                    <Bookmark size={14} className="shrink-0 text-muted-foreground transition-transform group-hover:scale-105 group-hover:text-primary" />
                    <AppHyperText as="span" duration={700} delay={120} className="text-xs font-medium">
                      북마크
                    </AppHyperText>
                    <ArrowUpRight size={13} className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto grid w-full max-w-md gap-3">
              <div className="relative h-52 w-full sm:h-60">
                <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-full bg-primary/12 blur-2xl" />
                <AppIconCloud images={cloudImages} className="h-full w-full" />
              </div>
              <div className="flex items-center justify-center gap-3">
                <img
                  src="/asset/koong/koong1.png"
                  alt=""
                  aria-hidden="true"
                  className="mushi-icon-float size-12 rounded-xl border border-border/70 object-cover shadow-md"
                />
                <img
                  src="/asset/login-mushi.jpg"
                  alt="무시"
                  className="size-16 rounded-2xl border border-border/70 object-cover shadow-lg shadow-primary/10"
                />
                <img
                  src="/asset/koong/koong5.png"
                  alt=""
                  aria-hidden="true"
                  className="mushi-icon-float size-12 rounded-xl border border-border/70 object-cover shadow-md"
                />
              </div>
            </div>
          </div>
        </header>
      </AppBlurFade>

      <AppBlurFade delay={0.03} direction="up" offset={8} inView>
        <EnvStrip />
      </AppBlurFade>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '작업 공간', value: 2, icon: LayoutDashboard, hint: '열려 있는 메뉴' },
          { label: '메모 바로가기', value: 1, icon: StickyNote, hint: '게시판 / 메모' },
          { label: '북마크 바로가기', value: 1, icon: Bookmark, hint: '저장된 링크' },
        ].map((stat, index) => (
          <AppBlurFade key={stat.label} delay={0.04 + index * 0.04} direction="up" inView>
            <AppMagicCard className="rounded-2xl border border-border/70">
              <div className="relative grid gap-3 overflow-hidden p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <AppHyperText as="span" delay={index * 80} className="text-xs tracking-wide">
                      {stat.label}
                    </AppHyperText>
                  </p>
                  <span className="inline-flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <stat.icon size={15} aria-hidden="true" />
                  </span>
                </div>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  <AppNumberTicker value={stat.value} />
                </p>
                <p className="text-xs text-muted-foreground">
                  <AppShinyText>{stat.hint}</AppShinyText>
                </p>
              </div>
            </AppMagicCard>
          </AppBlurFade>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <AppBlurFade delay={0.1} direction="up" inView>
          <AppMagicCard className="relative h-full overflow-hidden rounded-2xl border border-border/70">
            <AppBorderBeam size={80} duration={9} borderWidth={1.5} />
            <div className="relative grid gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold tracking-wide text-foreground">
                  오늘의 포인트
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <img
                  src="/asset/koong/koong2.png"
                  alt=""
                  aria-hidden="true"
                  className="mx-auto size-24 rounded-2xl border border-border/70 object-cover sm:mx-0 sm:size-28"
                />
                <div className="grid gap-2">
                  <div className="font-mushi text-xl text-foreground sm:text-2xl">
                    <AppWordRotate words={pointPhrases} duration={3200} as="span" className="font-mushi text-xl font-medium sm:text-2xl" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    <AppAuroraText className="text-sm leading-6">
                      급한 일만 짧게 보고, 나머지는 메모에 남겨둬. 구름 속 쿵이들이 옆에서 분위기 담당이야.
                    </AppAuroraText>
                  </p>
                  <Link
                    to="/notes/new"
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <AppHyperText as="span" className="text-sm font-medium text-primary">
                      새 글 쓰기
                    </AppHyperText>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </AppMagicCard>
        </AppBlurFade>

        <AppBlurFade delay={0.14} direction="up" inView>
          <AppMagicCard className="h-full rounded-2xl border border-border/70">
            <div className="grid gap-3 p-5">
              <h2 className="text-sm font-semibold tracking-wide text-foreground">
                <AppWordRotate
                  words={shortcutTitleWords}
                  duration={2800}
                  as="span"
                  className="text-sm font-semibold"
                />
              </h2>
              <ul className="grid gap-2.5">
                {shortcuts.map(item => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 transition-colors',
                        item.featured
                          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                          : 'border-border/70 bg-background/50 hover:border-primary/40 hover:bg-primary/5',
                      )}
                    >
                      {item.featured && <AppBorderBeam size={50} duration={7} borderWidth={1} />}
                      <img
                        src={item.image}
                        alt=""
                        aria-hidden="true"
                        className="size-11 shrink-0 rounded-xl border border-border/70 object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <item.icon size={14} className="text-primary" aria-hidden="true" />
                          <AppAuroraText className="text-sm font-medium">{item.label}</AppAuroraText>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          <AppShinyText>{item.description}</AppShinyText>
                        </span>
                      </span>
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </AppMagicCard>
        </AppBlurFade>
      </div>

      <AppBlurFade delay={0.18} direction="up" inView>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/50 p-4 sm:grid-cols-3 sm:p-5">
          {koongImages.slice(0, 3).map((src, index) => (
            <div
              key={src}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/40"
            >
              <img
                src={src}
                alt=""
                aria-hidden="true"
                className="h-28 w-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none sm:h-32"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-3 py-2 text-[11px] text-muted-foreground">
                <AppWordRotate
                  words={galleryCaptions[index] ?? [`Koong ${index + 1}`]}
                  duration={2200 + index * 200}
                  as="span"
                  className="text-[11px]"
                />
              </div>
            </div>
          ))}
        </div>
      </AppBlurFade>
    </section>
  )
}
