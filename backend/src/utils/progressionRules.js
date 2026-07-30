// ─────────────────────────────────────────────────────────────────────────────
// ПРАВИЛА ОТКРЫТИЯ ПРАКТИК — редакция клиента 2026-07-30 (docs/38).
//
// Что изменилось относительно прежней (2026-05-20) редакции:
//   • подписки больше нет — весь контент бесплатный, оплата ничего не открывает;
//   • снят 4-дневный цикл между открытиями;
//   • снято требование отметки в трекере;
//   • снят гейт mid-«Глубокого анализа» перед четвёртой практикой.
//
// Осталось единственное условие: следующая практика открывается после
// ПОЛНОГО прослушивания предыдущей.
//
// Форма прогрессии:
//   1. Блок `relaxation` («Точка тишины») — все практики открыты сразу,
//      порядок прослушивания любой. Это стартовые «четыре стандартные».
//   2. Когда прослушаны ВСЕ практики блока `relaxation` — открывается первая
//      практика сквозной последовательности.
//   3. Дальше — по одной: прослушал текущую, открылась следующая.
//
// Последовательность строится из контента CMS (Practice.block + order), а не
// из хардкода a1..a6: клиент добавляет практики в блоки через админку, и
// цепочка должна продолжаться сама, включая второй блок «Глубже в тишину».
// ─────────────────────────────────────────────────────────────────────────────

// Блок, который открыт с самого начала и служит входным условием.
export const FREE_BLOCK = 'relaxation'

// Блоки, идущие сквозной цепочкой, в порядке следования на главной.
export const SEQUENTIAL_BLOCKS = ['awareness', 'awareness2', 'author']

// Фолбэк на случай пустой таблицы Practice (свежая БД, локалка без сидов) —
// зеркалит application/src/api/mock.js.
const FALLBACK_CHAIN = {
  free: ['r1', 'r2', 'r3'],
  sequence: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
}

/**
 * Собирает цепочку прогрессии из строк Practice.
 * @param {Array<{slug:string, block:string, order:number}>} rows — published-практики
 * @returns {{free:string[], sequence:string[]}} slug'и в порядке открытия
 */
export function buildChain(rows) {
  const free = []
  const byBlock = new Map(SEQUENTIAL_BLOCKS.map((b) => [b, []]))

  // Тай-брейк по slug обязателен: в CMS `order` не уникален, и на проде уже
  // есть две практики awareness2 с order = 4. Без него порядок открытия
  // зависел бы от того, в каком порядке Postgres вернул строки, то есть мог
  // меняться между запросами.
  const sorted = [...rows].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.slug).localeCompare(String(b.slug))
  )
  for (const p of sorted) {
    if (p.block === FREE_BLOCK) free.push(p.slug)
    else if (byBlock.has(p.block)) byBlock.get(p.block).push(p.slug)
  }

  const sequence = SEQUENTIAL_BLOCKS.flatMap((b) => byBlock.get(b))
  if (!free.length && !sequence.length) return FALLBACK_CHAIN
  return { free, sequence }
}

/**
 * Что открывается следующим и что этому мешает.
 *
 * Практики блока `relaxation` в UnlockedAwareness не хранятся — они открыты
 * всегда и не участвуют в выдаче unlock'ов.
 *
 * @param {object} opts
 * @param {{free:string[], sequence:string[]}} opts.chain
 * @param {Set<string>} opts.unlockedSet — practiceId из UnlockedAwareness
 * @param {Set<string>} opts.completedSet — practiceId из PracticeCompletion
 * @returns {{id:string|null, reason:string, freeLeft?:number}}
 *   reason: 'unlock' | 'free-not-completed' | 'prev-not-completed' | 'all-unlocked'
 */
export function nextUnlock({ chain, unlockedSet, completedSet }) {
  const { free, sequence } = chain

  const idx = sequence.findIndex((slug) => !unlockedSet.has(slug))
  if (idx === -1) return { id: null, reason: 'all-unlocked' }

  if (idx === 0) {
    // Вход в цепочку — нужны прослушанными все практики бесплатного блока.
    const freeLeft = free.filter((slug) => !completedSet.has(slug)).length
    if (freeLeft > 0) return { id: null, reason: 'free-not-completed', freeLeft }
    return { id: sequence[0], reason: 'unlock' }
  }

  // Дальше по цепочке — только полное прослушивание предыдущей.
  // Условие «бесплатный блок пройден» здесь НЕ проверяем: у юзеров, которые
  // вошли в цепочку по старой (подписочной) механике, блок relaxation может
  // быть не прослушан, и мы не имеем права откатывать им прогресс.
  const prev = sequence[idx - 1]
  if (!completedSet.has(prev)) return { id: null, reason: 'prev-not-completed' }
  return { id: sequence[idx], reason: 'unlock' }
}

/**
 * Полный список открытых юзеру практик = бесплатный блок + строки
 * UnlockedAwareness, отфильтрованные по актуальной цепочке.
 */
export function unlockedPracticeIds({ chain, unlockedSet }) {
  return [...chain.free, ...chain.sequence.filter((slug) => unlockedSet.has(slug))]
}

// «Глубокий анализ» остаётся отдельной функцией приложения и БОЛЬШЕ НИЧЕГО
// не гейтит (прежде mid-DA блокировал четвёртую практику).
// Чекпоинты: start — вошёл в цепочку; mid — прошёл первые три; final — прошёл
// последнюю практику первого цикла.
export function whichDaCheckpoint({ chain, unlockedSet, completedSet, ktCount }) {
  const { sequence } = chain
  // Пока юзер не вошёл в цепочку (не прослушан бесплатный блок) — DA нет.
  if (!unlockedSet.size) return null
  if (ktCount === 0) return 'start'
  if (ktCount === 1) {
    const first3 = sequence.slice(0, 3)
    return first3.length && first3.every((slug) => completedSet.has(slug)) ? 'mid' : null
  }
  if (ktCount === 2) {
    const cycleEnd = sequence[5] ?? sequence[sequence.length - 1]
    return cycleEnd && completedSet.has(cycleEnd) ? 'final' : null
  }
  return null
}
