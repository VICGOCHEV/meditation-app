import { useProgressStore } from '../store/useProgressStore'
import { canDoDeepAnalysis, daysSince } from '../utils/dateHelpers'

export function useProgression() {
  const subscription = useProgressStore((s) => s.subscription)
  const unlockedPractices = useProgressStore((s) => s.unlockedPractices)
  const completedPractices = useProgressStore((s) => s.completedPractices)
  const lastDeepAnalysisDate = useProgressStore((s) => s.lastDeepAnalysisDate)
  const bonusUnlocked = useProgressStore((s) => s.bonusUnlocked)
  const checkBonus = useProgressStore((s) => s.checkBonusEligibility)

  const canAnalyze = canDoDeepAnalysis(lastDeepAnalysisDate)
  const daysUntilAnalysis = lastDeepAnalysisDate
    ? Math.max(0, 3 - daysSince(lastDeepAnalysisDate))
    : 0

  return {
    subscription,
    unlockedPractices,
    completedPractices,
    bonusUnlocked,
    canDoDeepAnalysis: canAnalyze,
    daysUntilAnalysis,
    bonusEligible: checkBonus(),
    isPracticeUnlocked: (id) => unlockedPractices.includes(id),
    isPracticeCompleted: (id) => completedPractices.includes(id),
  }
}
