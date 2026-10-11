export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type NoteType = 'post' | 'dev' | 'memo'
export type NoteInput = { title: string; content: string; type: NoteType; categoryId: string | null; isPinned: boolean; tags: string[] }
export function checkedOwner(ownerId: string): string {
  if (!uuidPattern.test(ownerId)) throw new Error('Verified owner required')
  return ownerId
}
export function parseNoteInput(value: unknown): NoteInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid note')
  const v = value as Record<string, unknown>
  if (Object.keys(v).some(k => !['title', 'content', 'type', 'categoryId', 'isPinned', 'tags'].includes(k))) throw new Error('Unexpected note field')
  if (typeof v.title !== 'string' || !v.title.trim() || v.title.length > 200) throw new Error('Invalid title')
  if (typeof v.content !== 'string' || v.content.length > 100000) throw new Error('Invalid content')
  if (v.type !== 'post' && v.type !== 'dev' && v.type !== 'memo') throw new Error('Invalid note type')
  if (v.categoryId !== undefined && v.categoryId !== null && (typeof v.categoryId !== 'string' || !uuidPattern.test(v.categoryId))) throw new Error('Invalid category')
  if (v.isPinned !== undefined && typeof v.isPinned !== 'boolean') throw new Error('Invalid pin')
  if (v.tags !== undefined && (!Array.isArray(v.tags) || v.tags.length > 12 || v.tags.some(t => typeof t !== 'string' || !t.trim() || t.length > 40))) throw new Error('Invalid tags')
  const tags = [...new Set(((v.tags ?? []) as string[]).map(t => t.trim().toLowerCase()))]
  return { title: v.title.trim(), content: v.content, type: v.type, categoryId: (v.categoryId as string | null) ?? null, isPinned: (v.isPinned as boolean) ?? false, tags }
}
export function parseNoteListQuery(v: Record<string, unknown>) {
  const page = v.page === undefined ? 1 : Number(v.page)
  const limit = v.limit === undefined ? 20 : Number(v.limit)
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid paging')
  if (v.type !== undefined && !['post', 'dev', 'memo'].includes(String(v.type))) throw new Error('Invalid type')
  const q = typeof v.q === 'string' ? v.q.trim() : ''
  if (q.length > 100) throw new Error('Query too long')
  if (v.categoryId !== undefined && (typeof v.categoryId !== 'string' || !uuidPattern.test(v.categoryId))) throw new Error('Invalid category')
  return { page, limit, q, type: v.type as NoteType | undefined, categoryId: v.categoryId as string | undefined }
}
