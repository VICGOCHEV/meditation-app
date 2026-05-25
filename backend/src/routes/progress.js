import { db } from '../db.js'
import { whichDaCheckpoint, nextAwarenessUnlock } from '../utils/progressionRules.js'

export async function progressRoutes(app) {
  // GET /api/progress — full user state snapshot
  app.get('/progress', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id

    const [sub, unlockedRows, completions, trackerRows, ktRows] =
      await Promise.all([
        db.subscription.findUnique({ where: { userId } }),
        db.unlockedAwareness.findMany({ where: { userId }, orderBy: { unlockedAt: 'asc' } }),
        db.practiceCompletion.findMany({ where: { userId }, orderBy: { completedAt: 'asc' } }),
        db.trackerDay.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
        db.ktEntry.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 12 }),
      ])

    const ktHistory = ktRows.map((e) => ({ date: e.createdAt.toISOString(), kt: e.kt }))
    const lastKtEntry = ktRows.at(-1) || null

    const completedSet = new Set(completions.map((r) => r.practiceId))
    const trackerSet = new Set(trackerRows.map((r) => r.date.toISOString().slice(0, 10)))
    const ktCount = ktRows.length

    // 3 чекпоинта DA вместо «раз в N дней». См. progressionRules.
    const daCheckpoint = whichDaCheckpoint({
      unlockedRows,
      completedSet,
      ktCount,
    })

    // Подсказка фронту: что мешает открыть следующую awareness (для UI
    // «новая откроется через X дней / после прохождения / после DA»).
    const nextUnlock = nextAwarenessUnlock({
      unlockedRows,
      completedSet,
      trackerSet,
      ktCount,
    })

    // Subscription active = подписка отмечена active и срок не истёк
    // (клиент 2026-05-20 — «дослушивает оплаченный период, потом lock»).
    const subActive =
      !!sub?.active && (!sub?.expiresAt || sub.expiresAt.getTime() > Date.now())

    return {
      subscription: {
        active: subActive,
        autoRenew: !!sub?.active,
        expiresAt: sub?.expiresAt ? sub.expiresAt.toISOString() : null,
      },
      unlockedPractices: unlockedRows.map((r) => r.practiceId),
      completedPractices: completions.map((r) => r.practiceId),
      trackerDays: trackerRows.map((r) => r.date.toISOString().slice(0, 10)),
      lastDeepAnalysisDate: lastKtEntry ? lastKtEntry.createdAt.toISOString() : null,
      lastKT: lastKtEntry ? lastKtEntry.kt : null,
      ktHistory,
      daCheckpoint,                  // 'start' | 'mid' | 'final' | null
      nextAwarenessUnlock: nextUnlock, // { id, reason, daysLeft? }
    }
  })
}
