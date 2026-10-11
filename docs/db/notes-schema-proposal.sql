-- Schema design applied to Mushi Supabase on 2026-10-11. Do not rerun blindly; use tracked migrations.
CREATE SCHEMA IF NOT EXISTS notes;
CREATE TABLE notes.note_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name varchar(80) NOT NULL, sort_order int NOT NULL DEFAULT 0, UNIQUE(id,owner_id), UNIQUE(owner_id,name));
CREATE TABLE notes.notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, type varchar(8) NOT NULL CHECK(type IN ('post','dev','memo')), title varchar(200) NOT NULL CHECK(length(trim(title))>0), content text NOT NULL DEFAULT '' CHECK(length(content)<=100000), category_id uuid, is_pinned boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, UNIQUE(id,owner_id), FOREIGN KEY(category_id,owner_id) REFERENCES notes.note_categories(id,owner_id));
CREATE TABLE notes.note_tags (note_id uuid NOT NULL, owner_id uuid NOT NULL, tag varchar(40) NOT NULL CHECK(length(trim(tag))>0), PRIMARY KEY(note_id,tag), FOREIGN KEY(note_id,owner_id) REFERENCES notes.notes(id,owner_id) ON DELETE CASCADE);
CREATE INDEX notes_active_owner ON notes.notes(owner_id,is_pinned DESC,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX notes_owner_type ON notes.notes(owner_id,type,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX note_tags_owner ON notes.note_tags(owner_id,tag);
-- Approve tenant-aware DB role/grants and RLS before running in production.
