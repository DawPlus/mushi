import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createApiClient } from '../src/lib/api.ts'

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api')
const origin = 'http://localhost:5173'
const testAccessToken = 'unit-test-only-access-token-12345678901234567890'

async function unusedPort() {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('live NestJS + Ky health response and restricted local CORS', async () => {
  const port = await unusedPort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: apiDir,
    env: { ...process.env, PORT: String(port), API_ACCESS_TOKEN: testAccessToken },
    stdio: 'ignore',
  })
  const stopped = new Promise((resolve) => child.once('exit', resolve))

  try {
    let online = false
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) break
      try {
        const response = await fetch(`${base}/health`)
        if (response.ok) { online = true; break }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.ok(online, 'NestJS server did not become ready')

    const result = await createApiClient(base).get('health').json()
    assert.deepEqual(result, { status: 'ok' })

    const missingToken = await fetch(`${base}/auth/check`)
    assert.equal(missingToken.status, 401)

    const wrongToken = await fetch(`${base}/auth/check`, {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    assert.equal(wrongToken.status, 401)

    const malformedToken = await fetch(`${base}/auth/check`, {
      headers: { Authorization: `bearer ${testAccessToken}` },
    })
    assert.equal(malformedToken.status, 401)

    const authorized = await fetch(`${base}/auth/check`, {
      headers: { Authorization: `Bearer ${testAccessToken}` },
    })
    assert.equal(authorized.status, 200)
    assert.deepEqual(await authorized.json(), { authenticated: true })

    const preflight = await fetch(`${base}/health`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin)

    const denied = await fetch(`${base}/health`, {
      headers: { Origin: 'https://not-allowed.example' },
    })
    assert.notEqual(denied.headers.get('access-control-allow-origin'), 'https://not-allowed.example')
  } finally {
    child.kill('SIGTERM')
    const timeout = setTimeout(() => child.kill('SIGKILL'), 2500)
    await stopped
    clearTimeout(timeout)
  }
})
