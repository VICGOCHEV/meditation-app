import { useProgressStore } from '../store/useProgressStore'

// AWARENESS_ORDER зеркалит backend/progressionRules — массив id-шек в
// порядке открытия. При месячной ротации содержание меняется в CMS, но
// слот-индекс 1..6 сохраняется.
const AWARENESS_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']

export function useProgression() {
  const subscription = useProgressStore((s) => s.subscription)
  const unlockedPractices = useProgressStore((s) => s.unlockedPractices)
  const completedPractices = useProgressStore((s) => s.completedPractices)
  const lastKT = useProgressStore((s) => s.lastKT)
  const ktHistory = useProgressStore((s) => s.ktHistory)
  const daCheckpoint = useProgressStore((s) => s.daCheckpoint)
  const nextAwarenessUnlock = useProgressStore((s) => s.nextAwarenessUnlock)

  // DA доступен только если сервер вернул один из 3 чекпоинтов
  // ('start' | 'mid' | 'final'). Кулдауна по дням больше нет —
  // вся логика на сервере (см. backend/src/utils/progressionRules.js).
  const canDoDeepAnalysis = daCheckpoint != null

  // На фронте больше нет «бонусной» страницы — её сняли в правках
  // клиента 2026-05-20. Если что-то ещё читает legacy bonusUnlocked,
  // возвращаем пустой массив.
  const bonusUnlocked = []

  return {
    subscription,
    unlockedPractices,
    completedPractices,
    bonusUnlocked,
    canDoDeepAnalysis,
    daCheckpoint,
    nextAwarenessUnlock,
    lastKT,
    ktHistory,
    awarenessOrder: AWARENESS_ORDER,
    isPracticeUnlocked: (id) => unlockedPractices.includes(id),
    isPracticeCompleted: (id) => completedPractices.includes(id),
  }
}
