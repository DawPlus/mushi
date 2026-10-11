import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, NotebookPen, Pin, Plus, Search } from 'lucide-react'
import { AppBlurFade, AppButton, AppConfirmDialog, AppInput, AppMagicCard } from '../../components/common'
import { cn } from '../../lib/utils'
import { createCategory, createNote, deleteNote, getNote, listCategories, listNotes, updateNote, type NoteInput, type NoteType } from './notes-api'

const kinds: { value: NoteType; name: string }[] = [
  { value: 'post', name: '게시글' }, { value: 'dev', name: '개발 노트' }, { value: 'memo', name: '개인 메모' },
]
const kindLabel = (value: string) => kinds.find(k => k.value === value)?.name ?? '메모'
const kindTone: Record<NoteType, string> = {
  post: 'border-primary/30 bg-primary/10 text-primary',
  dev: 'border-chart-2/35 bg-chart-2/10 text-chart-2',
  memo: 'border-border bg-muted/50 text-muted-foreground',
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = useMemo(() => content.split('\n'), [content])
  let code = false
  return <div className="space-y-1 break-words text-sm leading-7">
    {lines.map((line, index) => {
      if (line.startsWith('&#96;&#96;&#96;')) { code = !code; return <div key={index} /> }
      if (line.startsWith('```')) { code = !code; return <div key={index} /> }
      if (code) return <pre key={index} className="overflow-x-auto rounded bg-muted px-3 font-mono text-xs">{line}</pre>
      if (line.startsWith('### ')) return <h3 key={index} className="text-base font-semibold">{line.slice(4)}</h3>
      if (line.startsWith('## ')) return <h2 key={index} className="text-lg font-semibold">{line.slice(3)}</h2>
      if (line.startsWith('# ')) return <h1 key={index} className="text-xl font-bold">{line.slice(2)}</h1>
      if (line.startsWith('- ')) return <p key={index} className="pl-3">• {line.slice(2)}</p>
      return <p key={index} className="whitespace-pre-wrap">{line || ' '}</p>
    })}
  </div>
}

export function NotesList() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const categories = useQuery({ queryKey: ['note-categories'], queryFn: listCategories, retry: false })
  const notes = useQuery({ queryKey: ['notes', page, type, q, categoryId], queryFn: () => listNotes({ page, type, q, categoryId }), retry: false })
  const totalPages = notes.data ? Math.max(1, Math.ceil(notes.data.total / notes.data.limit)) : 1

  return (
    <section aria-label="게시판 / 메모" className="mx-auto grid max-w-5xl gap-6">
      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 size-48 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <NotebookPen size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Notes</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">게시판 / 메모</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">생각과 개발 기록을 한곳에 모아둬.</p>
              </div>
            </div>
            <Link to="/notes/new">
              <AppButton className="gap-1.5">
                <Plus size={16} aria-hidden="true" />
                새 글
              </AppButton>
            </Link>
          </div>
        </header>
      </AppBlurFade>

      <AppMagicCard className="rounded-2xl border border-border/70">
        <div className="grid gap-3 p-4 sm:p-5">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="글 검색"
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="제목 또는 내용 검색…"
              className="w-full rounded-xl border border-border bg-background/70 py-2.5 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setType(''); setPage(1) }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                type === '' ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-background/50 text-muted-foreground hover:text-foreground',
              )}
            >
              전체
            </button>
            {kinds.map(k => (
              <button
                key={k.value}
                type="button"
                onClick={() => { setType(k.value); setPage(1) }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  type === k.value ? kindTone[k.value] : 'border-border bg-background/50 text-muted-foreground hover:text-foreground',
                )}
              >
                {k.name}
              </button>
            ))}
            <select
              aria-label="카테고리 필터"
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setPage(1) }}
              className="ml-auto rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">모든 카테고리</option>
              {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </AppMagicCard>

      {notes.isPending && <p role="status" className="text-sm text-muted-foreground">게시글 불러오는 중…</p>}
      {notes.isError && <p role="alert" className="text-sm text-destructive">게시글을 불러오지 못했어. 로그인과 API 상태를 확인해줘.</p>}

      {notes.data?.items.length === 0 && (
        <AppMagicCard className="rounded-2xl border border-dashed border-border/80">
          <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
              <NotebookPen size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium text-foreground">아직 게시글이 없어</p>
              <p className="mt-1 text-sm text-muted-foreground">첫 메모를 작성해보자.</p>
            </div>
            <Link to="/notes/new"><AppButton size="sm" className="gap-1.5"><Plus size={14} />새 글 쓰기</AppButton></Link>
          </div>
        </AppMagicCard>
      )}

      <div className="grid gap-3">
        {notes.data?.items.map((note, index) => (
          <AppBlurFade key={note.id} delay={Math.min(index * 0.03, 0.18)} direction="up" inView>
            <Link to="/notes/$noteId" params={{ noteId: note.id }} className="block">
              <AppMagicCard className={cn(
                'rounded-2xl border border-border/70 transition-[border-color,box-shadow]',
                note.isPinned && 'border-primary/25 shadow-[0_0_24px_color-mix(in_oklab,var(--brand-skymint)_8%,transparent)]',
              )}>
                <article className="grid gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium', kindTone[note.type])}>
                      {kindLabel(note.type)}
                    </span>
                    {note.isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        <Pin size={11} aria-hidden="true" />
                        고정
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{note.title}</h2>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{note.content}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.tags.map(t => (
                        <span key={t} className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </AppMagicCard>
            </Link>
          </AppBlurFade>
        ))}
      </div>

      {notes.data && notes.data.total > 0 && (
        <div className="flex items-center justify-center gap-3">
          <AppButton size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</AppButton>
          <span className="text-xs tabular-nums text-muted-foreground">{page} / {totalPages}</span>
          <AppButton size="sm" variant="outline" disabled={page * notes.data.limit >= notes.data.total} onClick={() => setPage(p => p + 1)}>다음</AppButton>
        </div>
      )}
    </section>
  )
}

export function NoteDetail({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const nav = useNavigate()
  const cache = useQueryClient()
  const note = useQuery({ queryKey: ['note', id], queryFn: () => getNote(id), retry: false })
  const remove = useMutation({ mutationFn: () => deleteNote(id), onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['notes'] }); await nav({ to: '/notes' }) } })
  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <Link to="/notes" className="text-sm text-muted-foreground hover:text-primary">← 목록</Link>
      {note.isPending && <p role="status">읽는 중…</p>}
      {note.isError && <p role="alert">글을 열 수 없어.</p>}
      {note.data && <>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-border/70 bg-card/70 p-5 backdrop-blur-xl">
          <div>
            <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium', kindTone[note.data.type])}>
              {kindLabel(note.data.type)}
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{note.data.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/notes/$noteId/edit" params={{ noteId: id }}>
              <AppButton variant="outline" size="sm">수정</AppButton>
            </Link>
            <AppButton variant="destructive" size="sm" onClick={() => setConfirm(true)}>삭제</AppButton>
          </div>
        </div>
        <AppMagicCard className="rounded-2xl border border-border/70">
          <div className="p-5 sm:p-6"><MarkdownPreview content={note.data.content} /></div>
        </AppMagicCard>
        {note.data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.data.tags.map(t => (
              <span key={t} className="rounded-md border border-border/70 bg-background/60 px-2 py-1 text-xs text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
      </>}
      {remove.isError && <p role="alert" className="text-destructive">삭제에 실패했어.</p>}
      <AppConfirmDialog open={confirm} onOpenChange={setConfirm} title="게시글 삭제" description="이 글을 휴지통으로 이동할까?" pending={remove.isPending} onConfirm={() => remove.mutate()} />
    </section>
  )
}

export function NoteEditor({ id }: { id?: string }) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const current = useQuery({ queryKey: ['note', id], queryFn: () => getNote(id!), enabled: Boolean(id), retry: false })
  const [input, setInput] = useState<NoteInput>({ title: '', content: '', type: 'memo', categoryId: null, isPinned: false, tags: [] })
  const [tags, setTags] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const categories = useQuery({ queryKey: ['note-categories'], queryFn: listCategories, retry: false })
  const addCategory = useMutation({
    mutationFn: () => createCategory(newCategoryName),
    onSuccess: async category => {
      setNewCategoryName('')
      setInput(s => ({ ...s, categoryId: category.id }))
      await cache.invalidateQueries({ queryKey: ['note-categories'] })
    },
  })

  useEffect(() => {
    if (!current.data || loaded) return
    setInput({
      title: current.data.title,
      content: current.data.content,
      type: current.data.type,
      categoryId: current.data.categoryId,
      isPinned: current.data.isPinned,
      tags: current.data.tags,
    })
    setTags(current.data.tags.join(', '))
    setLoaded(true)
  }, [current.data, loaded])

  const save = useMutation({
    mutationFn: () => {
      const data = { ...input, tags: [...new Set(tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))] }
      return id ? updateNote(id, data) : createNote(data)
    },
    onSuccess: async result => {
      await cache.invalidateQueries({ queryKey: ['notes'] })
      await cache.invalidateQueries({ queryKey: ['note', result.id] })
      await navigate({ to: '/notes/$noteId', params: { noteId: result.id } })
    },
  })
  const submit = (e: FormEvent) => { e.preventDefault(); if (!save.isPending) save.mutate() }

  return (
    <section aria-label={id ? '글 수정' : '새 글 작성'} className="mx-auto grid max-w-5xl gap-5">
      <Link to="/notes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft size={14} aria-hidden="true" />
        목록
      </Link>

      <AppBlurFade delay={0} direction="up" offset={8} inView>
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 size-48 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <NotebookPen size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Editor</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {id ? '글 수정' : '새 글 작성'}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Markdown으로 작성하고 오른쪽에서 바로 미리볼 수 있어.
              </p>
            </div>
          </div>
        </header>
      </AppBlurFade>

      {id && current.isPending && <p role="status" className="text-sm text-muted-foreground">불러오는 중…</p>}
      {id && current.isError && <p role="alert" className="text-sm text-destructive">글을 불러오지 못했어.</p>}

      {(!id || current.isSuccess) && (
        <form onSubmit={submit} className="grid gap-4">
          <AppMagicCard className="rounded-2xl border border-border/70">
            <div className="grid gap-4 p-4 sm:p-5">
              <AppInput
                label="제목"
                required
                maxLength={200}
                value={input.title}
                onChange={e => setInput(s => ({ ...s, title: e.target.value }))}
                placeholder="제목을 입력해줘"
              />

              <div className="grid gap-2">
                <p className="text-sm font-medium">유형</p>
                <div className="flex flex-wrap gap-2">
                  {kinds.map(k => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => setInput(s => ({ ...s, type: k.value }))}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        input.type === k.value ? kindTone[k.value] : 'border-border bg-background/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {k.name}
                    </button>
                  ))}
                </div>
              </div>

              <AppInput
                label="태그 (쉼표로 구분)"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="react, 개발, 기록"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="grid gap-1.5 text-sm font-medium">
                  카테고리
                  <select
                    value={input.categoryId ?? ''}
                    onChange={e => setInput(s => ({ ...s, categoryId: e.target.value || null }))}
                    className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">미분류</option>
                    {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <AppInput
                  label="새 카테고리"
                  maxLength={80}
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="이름 입력"
                />
                <AppButton
                  type="button"
                  variant="outline"
                  disabled={!newCategoryName.trim() || addCategory.isPending}
                  onClick={() => addCategory.mutate()}
                >
                  추가
                </AppButton>
              </div>
              {addCategory.isError && <p role="alert" className="text-sm text-destructive">카테고리 추가 실패</p>}

              <label className="inline-flex w-fit items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={input.isPinned}
                  onChange={e => setInput(s => ({ ...s, isPinned: e.target.checked }))}
                  className="size-4 accent-[var(--brand-skymint)]"
                />
                <Pin size={14} className="text-primary" aria-hidden="true" />
                상단 고정
              </label>
            </div>
          </AppMagicCard>

          <div className="grid gap-4 md:grid-cols-2">
            <AppMagicCard className="rounded-2xl border border-border/70">
              <div className="grid gap-2 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Markdown 작성</p>
                  <span className="text-[11px] text-muted-foreground">{input.content.length.toLocaleString()}자</span>
                </div>
                <textarea
                  maxLength={100000}
                  value={input.content}
                  onChange={e => setInput(s => ({ ...s, content: e.target.value }))}
                  className="min-h-80 resize-y rounded-xl border border-border bg-background/70 p-4 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={'# 제목\n내용을 작성해줘'}
                />
              </div>
            </AppMagicCard>
            <AppMagicCard className="rounded-2xl border border-border/70">
              <div className="grid gap-2 p-4 sm:p-5">
                <p className="text-sm font-medium">미리보기</p>
                <div className="min-h-80 overflow-auto rounded-xl border border-border/70 bg-background/50 p-4">
                  {input.content.trim()
                    ? <MarkdownPreview content={input.content} />
                    : <p className="text-sm text-muted-foreground">작성한 내용이 여기에 보여.</p>}
                </div>
              </div>
            </AppMagicCard>
          </div>

          {save.isError && (
            <p role="alert" className="text-sm text-destructive">저장에 실패했어. API 상태와 내용을 확인해줘.</p>
          )}

          <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur-md">
            <Link to="/notes">
              <AppButton type="button" variant="outline">취소</AppButton>
            </Link>
            <AppButton disabled={save.isPending || !input.title.trim()} type="submit">
              {save.isPending ? '저장 중…' : '저장'}
            </AppButton>
          </div>
        </form>
      )}
    </section>
  )
}
