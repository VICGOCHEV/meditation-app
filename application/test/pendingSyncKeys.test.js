import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHECKIN_PENDING_KEY,
  COMPLETION_PENDING_KEY,
  clearCheckinPending,
  clearCompletionPending,
} from '../src/store/pendingSyncKeys.js'

test('pending sync queues use separate localStorage keys', () => {
  assert.equal(CHECKIN_PENDING_KEY, 'checkin_pending_sync')
  assert.equal(COMPLETION_PENDING_KEY, 'completion_pending_sync')
  assert.notEqual(CHECKIN_PENDING_KEY, COMPLETION_PENDING_KEY)
})

test('pending sync queues can be cleared independently on reset/logout', () => {
  const removed = []
  const storage = { removeItem: (key) => removed.push(key) }

  clearCheckinPending(storage)
  clearCompletionPending(storage)

  assert.deepEqual(removed, [CHECKIN_PENDING_KEY, COMPLETION_PENDING_KEY])
})
