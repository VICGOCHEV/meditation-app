import { db } from '../db.js'
import {
  nextUnlock,
  unlockedPracticeIds,
  whichDaCheckpoint,
} from '../utils/progressionRules.js'
import { loadChain } from '../utils/practiceChain.js'
import { buildKtProgressSnapshot } from '../utils/ktHistory.js'

export async function progressRoutes(app) {
  // GET /api/progress — full user state snapshot
  app.get('/progress', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id

    const [sub, unlockedRows, completions, trackerRows, ktRows, chain] =
      await Promise.all([
        db.subscription.findUnique({ where: { userId } }),
        db.unlockedAwareness.findMany({ where: { userId }, orderBy: { unlockedAt: 'asc' } }),
        db.practiceCompletion.findMany({ where: { userId }, orderBy: { completedAt: 'asc' } }),
        db.trackerDay.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
        db.ktEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 12 }),
        loadChain(),
      ])

    const { ktHistory, lastKtEntry } = buildKtProgressSnapshot(ktRows)

    const unlockedSet = new Set(unlockedRows.map((r) => r.practiceId))
    const completedSet = new Set(completions.map((r) => r.practiceId))
    const ktCount = ktRows.length

    // «Глубокий анализ» ничего не гейтит — самостоятельная функция с тремя
    // чекпоинтами (редакция правил 2026-07-30, см. progressionRules).
    const daCheckpoint = whichDaCheckpoint({ chain, unlockedSet, completedSet, ktCount })

    // Подсказка фронту: что мешает открыть следующую практику.
    const next = nextUnlock({ chain, unlockedSet, completedSet })

    return {
      // Подписки как механики доступа больше нет — весь контент бесплатный.
      // Блок оставлен в ответе, чтобы старые сборки фронта и уже лежащий у
      // юзеров localStorage-кэш не ломались: active всегда true.
      subscription: {
        active: true,
        autoRenew: false,
        expiresAt: sub?.expiresAt ? sub.expiresAt.toISOString() : null,
        tier: sub?.tier ?? null,
      },
      // Бесплатный блок открыт всегда, поэтому склеиваем его с цепочкой.
      unlockedPractices: unlockedPracticeIds({ chain, unlockedSet }),
      completedPractices: completions.map((r) => r.practiceId),
      trackerDays: trackerRows.map((r) => r.date.toISOString().slice(0, 10)),
      lastDeepAnalysisDate: lastKtEntry ? lastKtEntry.createdAt.toISOString() : null,
      lastKT: lastKtEntry ? lastKtEntry.kt : null,
      ktHistory,
      daCheckpoint,              // 'start' | 'mid' | 'final' | null
      nextAwarenessUnlock: next, // { id, reason, freeLeft? }
    }
  })
}
