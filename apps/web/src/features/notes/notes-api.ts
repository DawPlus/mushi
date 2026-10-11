import { ownerRequest } from '../../lib/owner-api'

export type NoteType = 'post' | 'dev' | 'memo'
export type Note = {
  id: string; title: string; content: string; type: NoteType;
  categoryId: string | null; isPinned: boolean; tags: string[];
  createdAt: string; updatedAt: string
}
export type NoteInput = Pick<Note, 'title' | 'content' | 'type' | 'categoryId' | 'isPinned' | 'tags'>
export type NotePage = { items: Note[]; total: number; page: number; limit: number }
export type NoteCategory = { id: string; name: string; sort_order: number }

export function listNotes(args: { page?: number; type?: string; q?: string; categoryId?: string } = {}) {
  const params = new URLSearchParams()
  if (args.page) params.set('page', String(args.page))
  if (args.type) params.set('type', args.type)
  if (args.categoryId) params.set('categoryId', args.categoryId)
  if (args.q) params.set('q', args.q)
  return ownerRequest<NotePage>('owner/notes?' + params)
}
export const getNote = (id: string) => ownerRequest<Note>('owner/notes/' + encodeURIComponent(id))
export const createNote = (input: NoteInput) => ownerRequest<Note>('owner/notes', { method: 'POST', body: input })
export const updateNote = (id: string, input: NoteInput) => ownerRequest<Note>('owner/notes/' + encodeURIComponent(id), { method: 'PATCH', body: input })
export const deleteNote = (id: string) => ownerRequest<void>('owner/notes/' + encodeURIComponent(id), { method: 'DELETE' })
export const listCategories = () => ownerRequest<NoteCategory[]>('owner/note-categories')
export const createCategory = (name: string) => ownerRequest<NoteCategory>('owner/note-categories', { method: 'POST', body: { name } })
