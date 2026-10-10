#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const present = path => existsSync(resolve(root, path))
const checks = [
  ['Web/API workspaces', present('apps/web/package.json') && present('apps/api/package.json')],
  ['Agent one-shot and watch modes', present('agent/checkin.mjs')],
  ['Agent env example documented', present('agent/README.md')],
  ['API env example', present('apps/api/.env.example')],
  ['API auth guard', present('apps/api/src/auth/api-token.guard.ts')],
  ['API burst limiter', present('apps/api/src/auth/burst-limit.guard.ts')],
  ['Monitor owner/device verification', present('apps/api/src/monitor/device-auth.ts') && present('apps/api/src/monitor/owner-auth.ts')],
  ['Local CLI allowlist', present('apps/api/src/system/cli-policy.ts')],
  ['Launchd template generator', present('agent/generate-launchd.mjs')],
]
const warnings = [
  'Production: heartbeat timestamp replay protection exists; authenticated per-job/device replay defense and shared rate limiting still pending.' ,
  'Production: owner-only CLI job staging HTTP API is available, but actual command execution/agent dispatch remains disabled pending durable queue and security review.' ,
  'Production: verify Supabase connection grants, Vercel server runtime compatibility and hosted owner-login E2E.',
  'Local: launchd registration is manual and not part of this check.',
]
for (const [label, ok] of checks) console.log((ok ? 'PASS ' : 'FAIL ') + label)
for (const warning of warnings) console.log('PENDING ' + warning)
if (checks.some(([, ok]) => !ok)) process.exitCode = 1
