import test from 'node:test'
import assert from 'node:assert/strict'
import { buildKtProgressSnapshot } from '../src/utils/ktHistory.js'

test('buildKtProgressSnapshot preserves latest KT from newest-first rows', () => {
  const rows = Array.from({ length: 13 }, (_, i) => ({
    createdAt: new Date(Date.UTC(2026, 0, i + 1)),
    kt: i + 1,
  }))
  const latestTwelveNewestFirst = rows.slice(1).reverse()

  const snapshot = buildKtProgressSnapshot(latestTwelveNewestFirst)

  assert.equal(snapshot.ktHistory.length, 12)
  assert.deepEqual(snapshot.ktHistory.map((entry) => entry.kt), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  assert.equal(snapshot.lastKtEntry.kt, 13)
})
