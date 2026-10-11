import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import postgres from 'postgres'

const path = './.env'
const env = readFileSync(path, 'utf8')
const match = env.match(/^DATABASE_URL=(.+)$/m)
if (!match) throw new Error('Missing admin DB URL')
const adminUrl = match[1].trim().replace(/^['"]|['"]$/g, '')
const admin = postgres(adminUrl, { max: 1, prepare: false })
const secret = randomBytes(40).toString('hex')
try {
  const rows = await admin`SELECT 1 FROM pg_roles WHERE rolname = 'mushi_notes_api'`
  if (!rows.length) await admin.unsafe("CREATE ROLE mushi_notes_api NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD '" + secret + "'")
  else await admin.unsafe("ALTER ROLE mushi_notes_api LOGIN PASSWORD '" + secret + "'")
  await admin.unsafe('GRANT USAGE ON SCHEMA notes TO mushi_notes_api')
  await admin.unsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notes TO mushi_notes_api')
  await admin.unsafe('REVOKE ALL ON SCHEMA notes FROM PUBLIC')
  const url = new URL(adminUrl)
  const projectRef = (url.username.split('.')[1] || 'mkcjqgbgzfjzudpdbqwo')
  url.username = 'mushi_notes_api.' + projectRef
  url.password = secret
  const notesUrl = url.toString()
  const limited = postgres(notesUrl, { max: 1, prepare: false })
  try {
    const rights = await limited`SELECT current_user AS role, has_schema_privilege(current_user,'notes','USAGE') AS notes_access, has_table_privilege(current_user,'notes.notes','INSERT,SELECT,UPDATE,DELETE') AS notes_tables, has_schema_privilege(current_user,'auth','USAGE') AS auth_access`
    if (!rights[0]?.notes_access || !rights[0]?.notes_tables || rights[0]?.auth_access) throw new Error('Role privilege verification failed')
    await limited`SELECT count(*) FROM notes.notes`
    const updatedEnv = env.replace(/^NOTES_DATABASE_URL=.*\n?/m, '').trimEnd() + '\nNOTES_DATABASE_URL=' + notesUrl + '\n'
    writeFileSync(path, updatedEnv, { mode: 0o600 })
    console.log('Notes-only runtime role created, privileges verified, and local server env configured')
  } finally { await limited.end() }
} finally { await admin.end() }
