// Ротация push-фраз: «не повторяться изо дня в день».
//
// До этого notifier брал случайную фразу на каждую отправку (pickRandom), из-за
// чего при пуле 10 один и тот же текст мог прийти два дня подряд, а половина
// пула не показывалась неделями. Здесь — модель «мешка»: пул раскладывается в
// порядок выдачи один раз на цикл, дальше выдаётся по одному элементу.
//
// Модуль намеренно чистый (никакой БД и Date) — вся логика ротации проверяется
// юнит-тестами, а notifier отвечает только за загрузку/сохранение состояния.
//
// Состояние живёт на ПОДПИСЧИКА БОТА и фазу дня — см. комментарий к модели
// PushRotationState в schema.prisma.

export const ROTATION_MODES = ['sequential', 'shuffled']
export const DEFAULT_ROTATION_MODE = 'shuffled'

export function normalizeMode(mode) {
  return ROTATION_MODES.includes(mode) ? mode : DEFAULT_ROTATION_MODE
}

// Fisher-Yates. rnd инжектится, чтобы тесты были детерминированными.
export function shuffle(items, rnd = Math.random) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Порядок выдачи на новый цикл.
 *
 * @param {Array<{id:number, order?:number}>} pool — активные фразы фазы
 * @param {'sequential'|'shuffled'} mode
 * @param {number|null} lastPushId — последняя выданная фраза прошлого цикла
 * @returns {number[]} id в порядке выдачи
 */
export function buildOrder(pool, mode, lastPushId = null, rnd = Math.random) {
  // Тай-брейк по id обязателен: в CMS `order` не уникален (там же, где он не
  // уникален у практик), без него порядок зависел бы от того, как Postgres
  // вернул строки.
  const ids = [...pool]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    .map((p) => p.id)

  if (normalizeMode(mode) !== 'shuffled' || ids.length < 2) return ids

  const order = shuffle(ids, rnd)
  // Стык циклов: первый элемент нового круга не должен совпасть с последним
  // элементом предыдущего — иначе один и тот же текст придёт два дня подряд.
  // При пуле из одной фразы повтор неизбежен, это отсекается условием выше.
  if (lastPushId != null && order[0] === lastPushId) {
    const j = 1 + Math.floor(rnd() * (order.length - 1))
    ;[order[0], order[j]] = [order[j], order[0]]
  }
  return order
}

/**
 * Следующая фраза для (подписчик, фаза).
 *
 * Курсор НЕ сохраняется здесь — функция возвращает новое состояние, а пишет его
 * вызывающий, и только после успешной отправки в Telegram. Поэтому упавшая
 * отправка не съедает фразу: следующий ретрай отдаст тот же текст.
 *
 * @param {object} opts
 * @param {{orderJson?:number[], position?:number, cycleNumber?:number,
 *          lastPushId?:number|null}|null} opts.state — сохранённое состояние
 * @param {Array<{id:number, order?:number}>} opts.pool — активные фразы фазы
 * @param {'sequential'|'shuffled'} opts.mode
 * @returns {{phraseId:number, nextState:object}|null} null — пул пуст
 */
export function pickNext({ state, pool, mode, rnd = Math.random }) {
  const poolIds = new Set(pool.map((p) => p.id))
  if (poolIds.size === 0) return null

  let order = Array.isArray(state?.orderJson) ? state.orderJson : []
  let position = Number.isInteger(state?.position) ? state.position : 0
  let cycleNumber = Number.isInteger(state?.cycleNumber) ? state.cycleNumber : 0
  const lastPushId = state?.lastPushId ?? null

  // Состояния нет, либо сохранённый порядок протух целиком (клиент заменил все
  // тексты) — начинаем новый цикл.
  if (order.length === 0 || !order.some((id) => poolIds.has(id))) {
    order = buildOrder(pool, mode, lastPushId, rnd)
    position = 0
    cycleNumber += 1
  }

  // Пул мог измениться в CMS посреди цикла: текущий цикл ДОИГРЫВАЕТСЯ на старом
  // порядке (удалённые/выключенные просто пропускаются), и только следующий
  // собирается из актуального пула. Иначе добавление одной фразы сбрасывало бы
  // всем подписчикам порядок и ломало «без повторов внутри цикла».
  let guard = order.length + poolIds.size + 2
  while (guard-- > 0) {
    if (position >= order.length) {
      order = buildOrder(pool, mode, lastPushId, rnd)
      position = 0
      cycleNumber += 1
      continue
    }
    const id = order[position]
    position += 1
    if (!poolIds.has(id)) continue
    return {
      phraseId: id,
      nextState: { orderJson: order, position, cycleNumber, lastPushId: id },
    }
  }
  return null
}
