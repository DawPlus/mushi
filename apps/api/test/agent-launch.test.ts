import test from 'node:test'
import assert from 'node:assert/strict'
import { isLocalAgentRequest } from '../src/monitor/agent-launch.js'

test('Mac Agent control requires both ends of connection to be loopback', () => {
  assert.equal(isLocalAgentRequest('127.0.0.1', '127.0.0.1'), true)
  assert.equal(isLocalAgentRequest('::1', '::1'), true)
  assert.equal(isLocalAgentRequest('::ffff:127.0.0.1', '127.0.0.1'), true)
  assert.equal(isLocalAgentRequest('192.168.0.2', '127.0.0.1'), false)
  assert.equal(isLocalAgentRequest('127.0.0.1', '10.0.0.3'), false)
  assert.equal(isLocalAgentRequest(undefined, '127.0.0.1'), false)
})
