import postgres from 'postgres'
import { checkedOwner, parseNoteInput, parseNoteListQuery, uuidPattern } from './note-contract.js'

type NoteRow = {
  id: string; title: string; content: string; type: string; category_id: string | null;
  is_pinned: boolean; created_at: Date; updated_at: Date; tags?: string[]
}
const mapNote = (n: NoteRow) => ({
  id: n.id, title: n.title, content: n.content, type: n.type,
  categoryId: n.category_id, isPinned: n.is_pinned,
  createdAt: n.created_at, updatedAt: n.updated_at, tags: n.tags ?? [],
})
function validId(id: string) { if (!uuidPattern.test(id)) throw new Error('Invalid note ID') }
export function createNotesRepository(url: string) {
  if (!url) throw new Error('DATABASE_URL required')
  const sql = postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false })
  return {
    async list(owner: string, query: Record<string, unknown> = {}) {
      checkedOwner(owner)
      const { page, limit, q, type, categoryId } = parseNoteListQuery(query)
      const search = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%'
      const rows = await sql<NoteRow[]>`
        SELECT n.*, COALESCE((SELECT array_agg(tag ORDER BY tag) FROM notes.note_tags
          WHERE note_id=n.id AND owner_id=n.owner_id),'{}'::text[]) AS tags
        FROM notes.notes n
        WHERE n.owner_id=${owner} AND n.deleted_at IS NULL
          AND (${type ?? null}::text IS NULL OR n.type=${type ?? null})
          AND (${categoryId ?? null}::uuid IS NULL OR n.category_id=${categoryId ?? null})
          AND (${q}='' OR n.title ILIKE ${search} OR n.content ILIKE ${search})
        ORDER BY n.is_pinned DESC,n.created_at DESC LIMIT ${limit} OFFSET ${(page-1)*limit}`
      const total = await sql<{ count: number }[]>`
        SELECT count(*)::integer AS count FROM notes.notes
        WHERE owner_id=${owner} AND deleted_at IS NULL
          AND (${type ?? null}::text IS NULL OR type=${type ?? null})
          AND (${categoryId ?? null}::uuid IS NULL OR category_id=${categoryId ?? null})
          AND (${q}='' OR title ILIKE ${search} OR content ILIKE ${search})`
      return { items: rows.map(n => ({ ...mapNote(n), content: n.content.slice(0, 160) })), page, limit, total: total[0]?.count ?? 0 }
    },
    async get(owner: string, id: string) {
      checkedOwner(owner); validId(id)
      const rows = await sql<NoteRow[]>`
        SELECT n.*, COALESCE((SELECT array_agg(tag ORDER BY tag) FROM notes.note_tags
          WHERE note_id=n.id AND owner_id=n.owner_id),'{}'::text[]) AS tags
        FROM notes.notes n WHERE n.owner_id=${owner} AND n.id=${id} AND n.deleted_at IS NULL LIMIT 1`
      return rows[0] ? mapNote(rows[0]) : null
    },
    async create(owner: string, raw: unknown) {
      checkedOwner(owner); const v = parseNoteInput(raw)
      return sql.begin(async tx => {
        const rows = await tx<NoteRow[]>`
          INSERT INTO notes.notes(owner_id,title,content,type,category_id,is_pinned)
          VALUES(${owner},${v.title},${v.content},${v.type},${v.categoryId},${v.isPinned}) RETURNING *`
        const note = rows[0]
        for (const tag of v.tags) await tx`INSERT INTO notes.note_tags(note_id,owner_id,tag) VALUES(${note.id},${owner},${tag})`
        return { ...mapNote(note), tags: v.tags }
      })
    },
    async update(owner: string, id: string, raw: unknown) {
      checkedOwner(owner); validId(id); const v = parseNoteInput(raw)
      return sql.begin(async tx => {
        const rows = await tx<NoteRow[]>`
          UPDATE notes.notes SET title=${v.title}, content=${v.content}, type=${v.type},
          category_id=${v.categoryId}, is_pinned=${v.isPinned}, updated_at=now()
          WHERE owner_id=${owner} AND id=${id} AND deleted_at IS NULL RETURNING *`
        if (!rows[0]) return null
        await tx`DELETE FROM notes.note_tags WHERE note_id=${id} AND owner_id=${owner}`
        for (const tag of v.tags) await tx`INSERT INTO notes.note_tags(note_id,owner_id,tag) VALUES(${id},${owner},${tag})`
        return { ...mapNote(rows[0]), tags: v.tags }
      })
    },
    async remove(owner: string, id: string) {
      checkedOwner(owner); validId(id)
      const rows = await sql<NoteRow[]>`
        UPDATE notes.notes SET deleted_at=now(),updated_at=now()
        WHERE owner_id=${owner} AND id=${id} AND deleted_at IS NULL RETURNING *`
      return Boolean(rows[0])
    },
    async categories(owner: string) {
      checkedOwner(owner)
      return sql`SELECT id,name,sort_order FROM notes.note_categories WHERE owner_id=${owner} ORDER BY sort_order,name`
    },
    async createCategory(owner: string, name: string) {
      checkedOwner(owner)
      if (typeof name !== 'string' || !name.trim() || name.length > 80) throw new Error('Invalid category')
      const rows = await sql`INSERT INTO notes.note_categories(owner_id,name) VALUES(${owner},${name.trim()}) RETURNING id,name,sort_order`
      return rows[0]
    },
    async updateCategory(owner: string, id: string, name: string) {
      checkedOwner(owner); validId(id)
      if (typeof name !== 'string' || !name.trim() || name.length > 80) throw new Error('Invalid category')
      const rows = await sql`UPDATE notes.note_categories SET name=${name.trim()} WHERE owner_id=${owner} AND id=${id} RETURNING id,name,sort_order`
      return rows[0] ?? null
    },
    async removeCategory(owner: string, id: string) {
      checkedOwner(owner); validId(id)
      // Keep note ownership and category references intact by clearing category in one transaction.
      return sql.begin(async tx => {
        await tx`UPDATE notes.notes SET category_id=NULL,updated_at=now() WHERE owner_id=${owner} AND category_id=${id}`
        const rows = await tx`DELETE FROM notes.note_categories WHERE owner_id=${owner} AND id=${id} RETURNING id`
        return Boolean(rows[0])
      })
    },
    async close() { await sql.end() },
  }
}
