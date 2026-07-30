import { useProgressStore } from '../store/useProgressStore'

// Текст возле заблокированной практики — формулировка клиента 2026-07-30.
export const LOCKED_HINT =
  'Следующая практика откроется после полного прослушивания предыдущей.'

export function useProgression() {
  const unlockedPractices = useProgressStore((s) => s.unlockedPractices)
  const completedPractices = useProgressStore((s) => s.completedPractices)
  const lastKT = useProgressStore((s) => s.lastKT)
  const ktHistory = useProgressStore((s) => s.ktHistory)
  const daCheckpoint = useProgressStore((s) => s.daCheckpoint)
  const nextAwarenessUnlock = useProgressStore((s) => s.nextAwarenessUnlock)

  // DA доступен только если сервер вернул один из 3 чекпоинтов
  // ('start' | 'mid' | 'final'). Сам он больше ничего не открывает — с
  // 2026-07-30 практики открываются только прослушиванием предыдущей
  // (см. backend/src/utils/progressionRules.js).
  const canDoDeepAnalysis = daCheckpoint != null

  return {
    unlockedPractices,
    completedPractices,
    canDoDeepAnalysis,
    daCheckpoint,
    nextAwarenessUnlock,
    lastKT,
    ktHistory,
    isPracticeUnlocked: (id) => unlockedPractices.includes(id),
    isPracticeCompleted: (id) => completedPractices.includes(id),
  }
}
