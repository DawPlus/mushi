import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query'
import { AppButton, AppConfirmDialog } from '../../components/common'
import { createBookmark,deleteBookmark,listBookmarks,updateBookmark,type BookmarkInput,type Bookmark } from './bookmarks-api'
const empty:BookmarkInput={url:'',title:'',description:'',category:'',tags:[],isFavorite:false}
export function BookmarksPage(){
 const cache=useQueryClient()
 const [q,setQ]=useState(''),[category,setCategory]=useState(''),[favorite,setFavorite]=useState(false),[page,setPage]=useState(1),[deleting,setDeleting]=useState<string|null>(null)
 const [editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<BookmarkInput>(empty),[tagText,setTagText]=useState('')
 const query=useQuery({queryKey:['bookmarks',q,category,favorite,page],queryFn:()=>listBookmarks(q,category,favorite,page),retry:false})
 const save=useMutation({mutationFn:()=>editing?updateBookmark(editing,form):createBookmark(form),onSuccess:async()=>{setEditing(null);setForm(empty);setTagText('');await cache.invalidateQueries({queryKey:['bookmarks']})}})
 const remove=useMutation({mutationFn:deleteBookmark,onSuccess:async()=>{setDeleting(null);await cache.invalidateQueries({queryKey:['bookmarks']})}})
 const submit=(e:FormEvent)=>{e.preventDefault();save.mutate()}
 const edit=(b:Bookmark)=>{setEditing(b.id);setForm({url:b.url,title:b.title,description:b.description,category:b.category,tags:b.tags,isFavorite:b.isFavorite});setTagText(b.tags.join(', '))}
 const field=(k:keyof BookmarkInput)=>(e:ChangeEvent<HTMLInputElement>)=>setForm(s=>({...s,[k]:e.target.value}))
 return <section className="mx-auto max-w-4xl space-y-5">
  <h1 className="text-2xl font-semibold">북마크</h1>
  <form onSubmit={submit} className="grid gap-2 rounded-xl border border-border p-4">
    <input required type="url" maxLength={2048} placeholder="https://example.com" aria-label="URL" value={form.url} onChange={field('url')} className="rounded border border-border bg-background p-2"/>
    <input required maxLength={200} placeholder="제목" aria-label="제목" value={form.title} onChange={field('title')} className="rounded border border-border bg-background p-2"/>
    <input maxLength={5000} placeholder="설명" aria-label="설명" value={form.description} onChange={field('description')} className="rounded border border-border bg-background p-2"/>
    <input maxLength={80} placeholder="카테고리" aria-label="카테고리" value={form.category} onChange={field('category')} className="rounded border border-border bg-background p-2"/>
    <input placeholder="태그 (쉼표 구분)" aria-label="태그" value={tagText} onChange={e=>{setTagText(e.target.value);setForm(s=>({...s,tags:[...new Set(e.target.value.split(',').map(x=>x.trim()).filter(Boolean))]}))}} className="rounded border border-border bg-background p-2"/>
    <label className="flex gap-2"><input type="checkbox" checked={form.isFavorite} onChange={e=>setForm(s=>({...s,isFavorite:e.target.checked}))}/> 즐겨찾기</label>
    {save.isError&&<p role="alert">저장 실패. 입력값과 API 설정을 확인해줘.</p>}
    <div className="flex gap-2"><AppButton disabled={save.isPending} type="submit">{editing?'수정 저장':'추가'}</AppButton>{editing&&<AppButton type="button" variant="outline" onClick={()=>{setEditing(null);setForm(empty);setTagText('')}}>취소</AppButton>}</div>
  </form>
  <div className="flex flex-wrap gap-2">
   <input aria-label="북마크 검색" placeholder="검색" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} className="flex-1 rounded border border-border bg-background p-2"/>
   <input aria-label="카테고리 필터" placeholder="카테고리 필터" value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}} className="rounded border border-border bg-background p-2"/>
   <label className="flex items-center gap-2"><input type="checkbox" checked={favorite} onChange={e=>{setFavorite(e.target.checked);setPage(1)}}/> 즐겨찾기만</label>
  </div>
  {query.isPending&&<p role="status">불러오는 중…</p>}
  {query.isError&&<p role="alert">북마크를 불러오지 못했어.</p>}
  {query.data?.items.length===0&&<p>등록된 북마크가 없어.</p>}
  <ul className="grid gap-2">{query.data?.items.map(b=><li key={b.id} className="rounded-xl border border-border p-4">
   <div className="flex items-start justify-between gap-2"><div className="min-w-0">
    <a href={b.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-primary underline">{b.title}</a>
    <p className="break-all text-xs text-muted-foreground">{b.url}</p><p className="text-sm">{b.description}</p>
    <p className="text-xs text-muted-foreground">{b.category} {b.isFavorite?'★':''} {b.tags.map(t=>'#'+t).join(' ')}</p>
   </div><div className="flex shrink-0 gap-2"><AppButton variant="outline" onClick={()=>edit(b)}>수정</AppButton><AppButton variant="destructive" disabled={remove.isPending} onClick={()=>setDeleting(b.id)}>삭제</AppButton></div></div>
  </li>)}</ul>
  {remove.isError&&<p role="alert">삭제 실패</p>}
  {query.data&&<nav aria-label="북마크 페이지" className="flex items-center justify-center gap-2"><AppButton type="button" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>이전</AppButton><span>{page} / {Math.max(1,Math.ceil(query.data.total/20))}</span><AppButton type="button" variant="outline" disabled={page*20>=query.data.total} onClick={()=>setPage(p=>p+1)}>다음</AppButton></nav>}
  <AppConfirmDialog open={deleting!==null} onOpenChange={open=>{if(!open)setDeleting(null)}} title="북마크 삭제" description="이 북마크를 삭제할까?" pending={remove.isPending} onConfirm={()=>{if(deleting)remove.mutate(deleting)}} />
 </section>
}
