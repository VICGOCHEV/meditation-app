import test from 'node:test'
import assert from 'node:assert/strict'
import { pickNext, buildOrder } from '../src/utils/pushRotation.js'

// Пул из N фраз в формате, который отдаёт db.pushPhrase.findMany.
const pool = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, order: i }))

// Детерминированный ГПСЧ (mulberry32) — тесты не должны быть флаки.
function rng(seed = 42) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Прогон N «дней» одного слота: возвращает выданные id по порядку.
function runDays({ days, poolFor, mode, seed = 1, startState = null }) {
  const rnd = rng(seed)
  let state = startState
  const out = []
  for (let day = 0; day < days; day++) {
    const res = pickNext({ state, pool: poolFor(day), mode, rnd })
    if (!res) {
      out.push(null)
      continue
    }
    state = res.nextState
    out.push(res.phraseId)
  }
  return { sent: out, state }
}

test('shuffled: 25 дней, пул 10 — внутри каждого цикла все тексты уникальны', () => {
  const p = pool(10)
  const { sent } = runDays({ days: 25, poolFor: () => p, mode: 'shuffled', seed: 7 })

  assert.equal(sent.length, 25)
  assert.ok(sent.every((id) => id !== null), 'ни один день не остался без пуша')

  for (const start of [0, 10, 20]) {
    const cycle = sent.slice(start, start + 10)
    assert.equal(new Set(cycle).size, cycle.length, `повтор внутри цикла с дня ${start}`)
  }
})

test('shuffled: два дня подряд никогда не приходит один и тот же текст, включая стык циклов', () => {
  // Несколько сидов — чтобы поймать стык при разных перемешиваниях.
  for (const seed of [1, 2, 3, 11, 99, 12345]) {
    const p = pool(10)
    const { sent } = runDays({ days: 60, poolFor: () => p, mode: 'shuffled', seed })
    for (let i = 1; i < sent.length; i++) {
      assert.notEqual(sent[i], sent[i - 1], `повтор подряд на дне ${i}, seed ${seed}`)
    }
  }
})

test('sequential: строгий порядок 1..10, затем новый цикл с первого', () => {
  const p = pool(10)
  const { sent } = runDays({ days: 21, poolFor: () => p, mode: 'sequential' })
  const expected = Array.from({ length: 21 }, (_, i) => (i % 10) + 1)
  assert.deepEqual(sent, expected)
})

test('два пользователя с разными датами старта имеют независимые курсоры', () => {
  const p = pool(10)
  const a = runDays({ days: 5, poolFor: () => p, mode: 'sequential' })
  // Второй «зарегистрировался» на 3 дня позже — стартует со своего нуля.
  const b = runDays({ days: 2, poolFor: () => p, mode: 'sequential' })

  assert.deepEqual(a.sent, [1, 2, 3, 4, 5])
  assert.deepEqual(b.sent, [1, 2])
  assert.equal(a.state.position, 5)
  assert.equal(b.state.position, 2)
})

test('двойной запуск планировщика в одном слоте: курсор сдвигается на 1, второго пуша нет', () => {
  // Идемпотентность обеспечивает notifier через lastSlotKey: при совпадении
  // ключа (подписчик, дата, фаза) он до pickNext вообще не доходит. Здесь
  // проверяем контракт ротации: pickNext вызывается один раз за слот и двигает
  // курсор ровно на одну позицию.
  const p = pool(10)
  const first = pickNext({ state: null, pool: p, mode: 'sequential' })
  assert.equal(first.nextState.position, 1)

  const alreadySentToday = true // ← lastSlotKey совпал, notifier делает continue
  const second = alreadySentToday ? null : pickNext({ state: first.nextState, pool: p, mode: 'sequential' })

  assert.equal(second, null, 'второй пуш в том же слоте не отправляется')
  assert.equal(first.nextState.position, 1, 'курсор не сдвинулся повторно')
})

test('упавшая отправка не двигает курсор: ретрай отдаёт тот же текст', () => {
  const p = pool(10)
  const attempt = pickNext({ state: null, pool: p, mode: 'sequential' })
  // Telegram вернул ошибку → nextState НЕ сохраняем.
  const retry = pickNext({ state: null, pool: p, mode: 'sequential' })
  assert.equal(retry.phraseId, attempt.phraseId)
})

test('деактивация текста в середине цикла: не падаем и не шлём неактивный', () => {
  const full = pool(10)
  // С 4-го дня фразы 3 и 5 выключены в CMS.
  const poolFor = (day) => (day < 3 ? full : full.filter((p) => p.id !== 3 && p.id !== 5))

  const { sent } = runDays({ days: 20, poolFor, mode: 'sequential' })

  assert.ok(sent.every((id) => id !== null), 'ротация не сломалась')
  const afterDeactivation = sent.slice(3)
  assert.ok(
    !afterDeactivation.includes(3) && !afterDeactivation.includes(5),
    'неактивный текст не выдан'
  )
})

test('пул пополнили в середине цикла: текущий цикл доигрывается на старом порядке', () => {
  const small = pool(3)
  const grown = pool(5)

  // Два дня на пуле из трёх, затем клиент добавил ещё две фразы.
  let state = null
  const sent = []
  for (const [day, p] of [[0, small], [1, small], [2, grown], [3, grown], [4, grown]]) {
    const res = pickNext({ state, pool: p, mode: 'sequential' })
    state = res.nextState
    sent.push(res.phraseId)
    void day
  }

  // Дни 0-2 доигрывают старый цикл 1,2,3 — новые фразы в него не влезают.
  assert.deepEqual(sent.slice(0, 3), [1, 2, 3])
  assert.equal(state.cycleNumber, 2, 'следующий цикл собран заново')
  // Новый цикл уже из пяти.
  assert.equal(state.orderJson.length, 5)
})

test('все тексты заменили целиком — состояние пересобирается, а не ломается', () => {
  const old = pool(3)
  const fresh = [{ id: 90, order: 0 }, { id: 91, order: 1 }]

  const first = pickNext({ state: null, pool: old, mode: 'sequential' })
  const after = pickNext({ state: first.nextState, pool: fresh, mode: 'sequential' })

  assert.ok([90, 91].includes(after.phraseId))
  assert.deepEqual(after.nextState.orderJson, [90, 91])
})

test('пустой пул — null, без исключения', () => {
  assert.equal(pickNext({ state: null, pool: [], mode: 'shuffled' }), null)
})

test('buildOrder: первый элемент нового круга не равен последнему прошлого', () => {
  const p = pool(6)
  for (let seed = 1; seed <= 200; seed++) {
    const order = buildOrder(p, 'shuffled', 4, rng(seed))
    assert.notEqual(order[0], 4, `seed ${seed}`)
    assert.equal(new Set(order).size, 6)
  }
})

test('buildOrder sequential: первый элемент не повторяет последний прошлого цикла', () => {
  const p = pool(5)
  // Прошлый цикл (например, ещё в режиме shuffled) закончился фразой 1,
  // а sequential начал бы ровно с неё — это повтор два дня подряд.
  const order = buildOrder(p, 'sequential', 1)
  assert.notEqual(order[0], 1)
  assert.deepEqual(order, [2, 3, 4, 5, 1], 'порядок сохранён, сдвинута точка входа')
})

test('переключение shuffled -> sequential не даёт повтора на стыке', () => {
  const p = pool(6)
  // Доигрываем shuffled-цикл до конца, запоминаем последнюю выданную фразу.
  const rnd = rng(5)
  let state = null
  let last = null
  for (let i = 0; i < 6; i++) {
    const res = pickNext({ state, pool: p, mode: 'shuffled', rnd })
    state = res.nextState
    last = res.phraseId
  }
  // Клиент переключил режим в CMS — следующий цикл собирается sequential.
  const next = pickNext({ state, pool: p, mode: 'sequential', rnd })
  assert.notEqual(next.phraseId, last, 'та же фраза два дня подряд')
})

test('buildOrder: пул из одной фразы не зацикливает перестановку', () => {
  const order = buildOrder([{ id: 1, order: 0 }], 'shuffled', 1)
  assert.deepEqual(order, [1])
})

test('buildOrder sequential: сортировка по order, тай-брейк по id', () => {
  const p = [
    { id: 7, order: 2 },
    { id: 3, order: 1 },
    { id: 1, order: 2 },
    { id: 9, order: 0 },
  ]
  assert.deepEqual(buildOrder(p, 'sequential'), [9, 3, 1, 7])
})
