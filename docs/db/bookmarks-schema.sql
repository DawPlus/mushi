-- Applied to Mushi Supabase on 2026-10-11.
-- Reproducible schema, separate from Vercel deployment.
CREATE SCHEMA IF NOT EXISTS bookmarks;
CREATE TABLE IF NOT EXISTS bookmarks.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  url text NOT NULL,
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '',
  category varchar(80) NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS bookmarks_owner_index ON bookmarks.items(owner_id,created_at DESC) WHERE deleted_at IS NULL;
REVOKE ALL ON SCHEMA bookmarks FROM PUBLIC;
GRANT USAGE ON SCHEMA bookmarks TO mushi_core_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON bookmarks.items TO mushi_core_api;
