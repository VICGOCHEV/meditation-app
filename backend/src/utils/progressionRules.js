const DAY = 24 * 60 * 60 * 1000

// Шесть последовательных практик «Осознанности» в порядке открытия.
// При месячной ротации (см. CMS month_slot) сами файлы меняются, но
// порядок «1..6» сохраняется — мы открываем по индексу в этом массиве.
export const AWARENESS_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']

// 4-дневный шаг между открытиями awareness (клиент 2026-05-20).
export const PROGRESSION_CYCLE_DAYS = 4

export const isAwarenessId = (id) => AWARENESS_ORDER.includes(id)

// DA появляется в 3 чекпоинтах — клиент 2026-05-20:
//   start  → сразу после открытия a1 (юзер только что купил подписку),
//   mid    → перед открытием a4, требует завершения первых трёх,
//   final  → после прохождения a6, итог курса.
// Третья DA gate'ит a4: a4 не откроется, пока юзер не пройдёт mid-DA.
// Возвращает 'start' | 'mid' | 'final' | null.
export function whichDaCheckpoint({ unlockedRows, completedSet, ktCount }) {
  // Не запущена подписка — DA вообще недоступен.
  if (!unlockedRows.length) return null
  // a1 открыта, KT ещё не было — старт.
  if (ktCount === 0) return 'start'
  // Прошёл DA #1, завершил 3 первые → mid, нужен перед a4.
  if (ktCount === 1) {
    const first3Done = ['a1', 'a2', 'a3'].every((id) => completedSet.has(id))
    return first3Done ? 'mid' : null
  }
  // Прошёл DA #2, после a6 → final.
  if (ktCount === 2) {
    return completedSet.has('a6') ? 'final' : null
  }
  return null
}

// Можно ли открыть следующую awareness?
// Условия (клиент 2026-05-20):
//   1. Прошло ≥ PROGRESSION_CYCLE_DAYS дней с прошлого открытия.
//   2. Прошлая awareness completed.
//   3. День прошлого прослушивания зафиксирован в трекере.
//   4. Если следующая — a4, нужен пройденный mid-DA.
// Возвращает id для открытия или null + причину.
export function nextAwarenessUnlock({
  unlockedRows,           // [{practiceId, unlockedAt}]
  completedSet,           // Set<practiceId>
  trackerSet,             // Set<YYYY-MM-DD>
  ktCount,                // total KtEntry rows
  now = Date.now(),
}) {
  // Какая следующая по списку — первая не открытая.
  const unlockedIds = new Set(unlockedRows.map((r) => r.practiceId))
  const nextIdx = AWARENESS_ORDER.findIndex((id) => !unlockedIds.has(id))
  if (nextIdx === -1) return { id: null, reason: 'all-unlocked' }
  if (nextIdx === 0) return { id: null, reason: 'sub-not-active' }

  const prevId = AWARENESS_ORDER[nextIdx - 1]
  const prevRow = unlockedRows.find((r) => r.practiceId === prevId)
  if (!prevRow) return { id: null, reason: 'prev-not-found' }

  // 1) 4 дня прошли
  const elapsedDays = Math.floor((now - new Date(prevRow.unlockedAt).getTime()) / DAY)
  if (elapsedDays < PROGRESSION_CYCLE_DAYS) {
    return { id: null, reason: 'cycle-not-elapsed', daysLeft: PROGRESSION_CYCLE_DAYS - elapsedDays }
  }
  // 2) предыдущая прослушана
  if (!completedSet.has(prevId)) return { id: null, reason: 'prev-not-completed' }
  // 3) день прослушивания в трекере (любая дата ≥ unlockedAt предыдущей)
  const prevUnlockISO = new Date(prevRow.unlockedAt).toISOString().slice(0, 10)
  const hasTrackerSince = [...trackerSet].some((d) => d >= prevUnlockISO)
  if (!hasTrackerSince) return { id: null, reason: 'no-tracker-mark' }
  // 4) mid-DA gate для a4 (индекс 3)
  if (nextIdx === 3 && ktCount < 2) {
    return { id: null, reason: 'mid-da-required' }
  }

  return { id: AWARENESS_ORDER[nextIdx], reason: 'unlock' }
}
