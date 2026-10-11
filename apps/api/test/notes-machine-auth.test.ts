import test from 'node:test'
import assert from 'node:assert/strict'
import { requireNotesOwnerFromBearer } from '../src/auth/require-notes-owner.js'

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const secret = 'unit-test-machine-token-strong-0123456789'
test('Notes machine bearer resolves configured owner without browser login', async () => {
  const before = { secret: process.env.MUSHI_LOCAL_SERVICE_TOKEN, owner: process.env.SUPABASE_OWNER_USER_ID }
  try {
    process.env.MUSHI_LOCAL_SERVICE_TOKEN = secret
    process.env.SUPABASE_OWNER_USER_ID = owner
    assert.equal(await requireNotesOwnerFromBearer('Bearer ' + secret), owner)
    await assert.rejects(() => requireNotesOwnerFromBearer('Bearer wrong'), /Unauthorized/)
  } finally {
    if (before.secret === undefined) delete process.env.MUSHI_LOCAL_SERVICE_TOKEN
    else process.env.MUSHI_LOCAL_SERVICE_TOKEN = before.secret
    if (before.owner === undefined) delete process.env.SUPABASE_OWNER_USER_ID
    else process.env.SUPABASE_OWNER_USER_ID = before.owner
  }
})
test('Notes machine token fails closed when weak or unconfigured', async () => {
  const before = { secret: process.env.MUSHI_LOCAL_SERVICE_TOKEN, owner: process.env.SUPABASE_OWNER_USER_ID }
  try {
    process.env.MUSHI_LOCAL_SERVICE_TOKEN = 'weak'
    process.env.SUPABASE_OWNER_USER_ID = owner
    await assert.rejects(() => requireNotesOwnerFromBearer('Bearer weak'), /Unauthorized/)
    delete process.env.MUSHI_LOCAL_SERVICE_TOKEN
    await assert.rejects(() => requireNotesOwnerFromBearer('Bearer ' + secret), /Unauthorized/)
  } finally {
    if (before.secret === undefined) delete process.env.MUSHI_LOCAL_SERVICE_TOKEN
    else process.env.MUSHI_LOCAL_SERVICE_TOKEN = before.secret
    if (before.owner === undefined) delete process.env.SUPABASE_OWNER_USER_ID
    else process.env.SUPABASE_OWNER_USER_ID = before.owner
  }
})
