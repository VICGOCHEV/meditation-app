import { useProgressStore } from '../store/useProgressStore'
import { canDoDeepAnalysis, daysSince } from '../utils/dateHelpers'

export function useProgression() {
  const subscription = useProgressStore((s) => s.subscription)
  const unlockedPractices = useProgressStore((s) => s.unlockedPractices)
  const completedPractices = useProgressStore((s) => s.completedPractices)
  const lastDeepAnalysisDate = useProgressStore((s) => s.lastDeepAnalysisDate)
  const lastKT = useProgressStore((s) => s.lastKT)
  const ktHistory = useProgressStore((s) => s.ktHistory)
  const bonusUnlocked = useProgressStore((s) => s.bonusUnlocked)
  const getBonusProgress = useProgressStore((s) => s.getBonusProgress)

  const canAnalyze = canDoDeepAnalysis(lastDeepAnalysisDate)
  const daysUntilAnalysis = lastDeepAnalysisDate
    ? Math.max(0, 3 - daysSince(lastDeepAnalysisDate))
    : 0
  const bonus = getBonusProgress()

  return {
    subscription,
    unlockedPractices,
    completedPractices,
    bonusUnlocked,
    canDoDeepAnalysis: canAnalyze,
    daysUntilAnalysis,
    lastKT,
    ktHistory,
    bonus,
    bonusEligible: bonus.eligible,
    isPracticeUnlocked: (id) => unlockedPractices.includes(id),
    isPracticeCompleted: (id) => completedPractices.includes(id),
  }
}
