# Mushi Notes implementation contract
Unified owner-private post/dev/memo Markdown documents with categories, tags and search.
Reuse OwnerLogin, AppShell, TanStack Query, common UI, NestJS requireOwnerFromBearer.
API: GET/POST /owner/notes, GET/PATCH/DELETE /owner/notes/:id, GET/POST /owner/note-categories, PATCH/DELETE /owner/note-categories/:id.
DB: notes(id,owner_id,title,content,type,category_id,is_pinned,created_at,updated_at,deleted_at); note_categories(id,owner_id,name,sort_order); note_tags(note_id,tag).
Owner scoping on every read/write and category reference; input bounds, pagination, soft delete, Markdown HTML sanitization.
Hosted API route policy is login-only and must explicitly allow Notes endpoints after review.
No production migration, Vercel release, credential or DB role changes without human approval.
Work order: schema, API, UI, integrated verification.
