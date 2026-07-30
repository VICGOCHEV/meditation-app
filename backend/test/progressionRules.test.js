import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChain,
  nextUnlock,
  unlockedPracticeIds,
  whichDaCheckpoint,
} from '../src/utils/progressionRules.js'

// Контент как в проде: 4 бесплатные практики + два блока осознанности.
const ROWS = [
  { slug: 'r1', block: 'relaxation', order: 1 },
  { slug: 'r2', block: 'relaxation', order: 2 },
  { slug: 'r3', block: 'relaxation', order: 3 },
  { slug: 'r4', block: 'relaxation', order: 4 },
  { slug: 'a1', block: 'awareness', order: 1 },
  { slug: 'a2', block: 'awareness', order: 2 },
  { slug: 'a3', block: 'awareness', order: 3 },
  { slug: 'b1', block: 'awareness2', order: 1 },
]
const CHAIN = buildChain(ROWS)

const sets = (unlocked, completed) => ({
  unlockedSet: new Set(unlocked),
  completedSet: new Set(completed),
})

test('цепочка: бесплатный блок отдельно, остальные блоки подряд', () => {
  assert.deepEqual(CHAIN.free, ['r1', 'r2', 'r3', 'r4'])
  assert.deepEqual(CHAIN.sequence, ['a1', 'a2', 'a3', 'b1'])
})

test('цепочка склеивает блоки по порядку внутри каждого блока', () => {
  // order считается внутри блока, поэтому b1 (order 1) обязан идти ПОСЛЕ a3.
  const shuffled = buildChain([...ROWS].reverse())
  assert.deepEqual(shuffled.sequence, ['a1', 'a2', 'a3', 'b1'])
})

test('одинаковый order даёт стабильный порядок, а не зависящий от выдачи БД', () => {
  // На проде две практики awareness2 лежат с order = 4. Порядок открытия
  // не должен зависеть от того, как Postgres вернул строки.
  const tied = [
    { slug: 'z-vtoraya', block: 'awareness2', order: 4 },
    { slug: 'a-pervaya', block: 'awareness2', order: 4 },
  ]
  const direct = buildChain(tied).sequence
  const reversed = buildChain([...tied].reverse()).sequence
  assert.deepEqual(direct, reversed)
  assert.deepEqual(direct, ['a-pervaya', 'z-vtoraya'])
})

test('пустой контент падает на фолбэк, а не на пустую цепочку', () => {
  const fallback = buildChain([])
  assert.ok(fallback.free.length > 0)
  assert.ok(fallback.sequence.length > 0)
})

test('первая практика курса закрыта, пока не пройден весь бесплатный блок', () => {
  const res = nextUnlock({ chain: CHAIN, ...sets([], ['r1', 'r2', 'r3']) })
  assert.equal(res.id, null)
  assert.equal(res.reason, 'free-not-completed')
  assert.equal(res.freeLeft, 1)
})

test('после всех бесплатных открывается первая практика курса', () => {
  const res = nextUnlock({ chain: CHAIN, ...sets([], ['r1', 'r2', 'r3', 'r4']) })
  assert.equal(res.id, 'a1')
  assert.equal(res.reason, 'unlock')
})

test('оплата не участвует: без подписки цепочка идёт дальше', () => {
  const res = nextUnlock({
    chain: CHAIN,
    ...sets(['a1'], ['r1', 'r2', 'r3', 'r4', 'a1']),
  })
  assert.equal(res.id, 'a2')
})

test('следующая закрыта, пока предыдущая не прослушана до конца', () => {
  const res = nextUnlock({ chain: CHAIN, ...sets(['a1'], ['r1', 'r2', 'r3', 'r4']) })
  assert.equal(res.id, null)
  assert.equal(res.reason, 'prev-not-completed')
})

test('цепочка продолжается во второй блок осознанности', () => {
  const res = nextUnlock({
    chain: CHAIN,
    ...sets(['a1', 'a2', 'a3'], ['a1', 'a2', 'a3']),
  })
  assert.equal(res.id, 'b1')
})

test('всё открыто — больше открывать нечего', () => {
  const res = nextUnlock({
    chain: CHAIN,
    ...sets(['a1', 'a2', 'a3', 'b1'], ['a1', 'a2', 'a3', 'b1']),
  })
  assert.equal(res.id, null)
  assert.equal(res.reason, 'all-unlocked')
})

test('юзер из старой подписочной механики не откатывается назад', () => {
  // a1 открыта оплатой, бесплатный блок не прослушан — цепочка обязана
  // продолжаться по прослушиванию, а не требовать пройти relaxation.
  const res = nextUnlock({ chain: CHAIN, ...sets(['a1'], ['a1']) })
  assert.equal(res.id, 'a2')
})

test('открытые практики = бесплатный блок + открытое из цепочки', () => {
  const ids = unlockedPracticeIds({ chain: CHAIN, unlockedSet: new Set(['a1', 'a2']) })
  assert.deepEqual(ids, ['r1', 'r2', 'r3', 'r4', 'a1', 'a2'])
})

test('открытые практики игнорируют мусор, которого нет в контенте', () => {
  const ids = unlockedPracticeIds({ chain: CHAIN, unlockedSet: new Set(['a1', 'zzz']) })
  assert.deepEqual(ids, ['r1', 'r2', 'r3', 'r4', 'a1'])
})

test('DA закрыт, пока юзер не вошёл в курс', () => {
  assert.equal(
    whichDaCheckpoint({ chain: CHAIN, ...sets([], ['r1']), ktCount: 0 }),
    null
  )
})

test('DA: старт сразу после входа в курс', () => {
  assert.equal(
    whichDaCheckpoint({ chain: CHAIN, ...sets(['a1'], []), ktCount: 0 }),
    'start'
  )
})

test('DA: mid только после трёх пройденных практик курса', () => {
  const notYet = whichDaCheckpoint({
    chain: CHAIN,
    ...sets(['a1', 'a2'], ['a1', 'a2']),
    ktCount: 1,
  })
  assert.equal(notYet, null)

  const ready = whichDaCheckpoint({
    chain: CHAIN,
    ...sets(['a1', 'a2', 'a3'], ['a1', 'a2', 'a3']),
    ktCount: 1,
  })
  assert.equal(ready, 'mid')
})
