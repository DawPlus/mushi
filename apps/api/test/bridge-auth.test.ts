import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBridgeToken, verifyBridgeBearer } from '../src/bridge/bridge-auth.js'

test('resolveBridgeToken prefers MUSHI_BRIDGE_TOKEN over ONION_BRIDGE_TOKEN', () => {
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  try {
    process.env.MUSHI_BRIDGE_TOKEN = 'mushi-token-value-32chars-minimum!!'
    process.env.ONION_BRIDGE_TOKEN = 'onion-token-value-32chars-minimum!!'
    assert.equal(resolveBridgeToken(), 'mushi-token-value-32chars-minimum!!')
  } finally {
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
  }
})

test('resolveBridgeToken falls back to ONION_BRIDGE_TOKEN when Mushi token unset', () => {
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  try {
    delete process.env.MUSHI_BRIDGE_TOKEN
    process.env.ONION_BRIDGE_TOKEN = 'onion-token-value-32chars-minimum!!'
    assert.equal(resolveBridgeToken(), 'onion-token-value-32chars-minimum!!')
  } finally {
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
  }
})

test('verifyBridgeBearer rejects missing, wrong, and unconfigured tokens', () => {
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  try {
    delete process.env.MUSHI_BRIDGE_TOKEN
    delete process.env.ONION_BRIDGE_TOKEN
    assert.equal(verifyBridgeBearer('Bearer anything'), false)

    process.env.MUSHI_BRIDGE_TOKEN = 'correct-bridge-token-32chars-min!!'
    assert.equal(verifyBridgeBearer(undefined), false)
    assert.equal(verifyBridgeBearer('Bearer wrong-token'), false)
    assert.equal(verifyBridgeBearer('Basic correct-bridge-token-32chars-min!!'), false)
    assert.equal(verifyBridgeBearer('Bearer correct-bridge-token-32chars-min!!'), true)
  } finally {
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
  }
})

test('verifyBridgeBearer rejects bridge tokens shorter than 32 characters', () => {
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  const short31 = '1234567890123456789012345678901'
  const exact32 = '12345678901234567890123456789012'
  try {
    delete process.env.ONION_BRIDGE_TOKEN
    process.env.MUSHI_BRIDGE_TOKEN = 'short-token'
    assert.equal(verifyBridgeBearer('Bearer short-token'), false)

    assert.equal(short31.length, 31)
    process.env.MUSHI_BRIDGE_TOKEN = short31
    assert.equal(verifyBridgeBearer(`Bearer ${short31}`), false)

    assert.equal(exact32.length, 32)
    process.env.MUSHI_BRIDGE_TOKEN = exact32
    assert.equal(verifyBridgeBearer(`Bearer ${exact32}`), true)
  } finally {
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
  }
})
