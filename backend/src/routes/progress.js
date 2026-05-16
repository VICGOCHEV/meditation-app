import { db } from '../db.js'
import { evaluateBonus } from '../utils/progressionRules.js'

export async function progressRoutes(app) {
  // GET /api/progress — full user state snapshot
  app.get('/progress', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id

    const [sub, unlockedRows, completions, trackerRows, ktRows, bonusRows] =
      await Promise.all([
        db.subscription.findUnique({ where: { userId } }),
        db.unlockedAwareness.findMany({ where: { userId }, orderBy: { unlockedAt: 'asc' } }),
        db.practiceCompletion.findMany({ where: { userId }, orderBy: { completedAt: 'asc' } }),
        db.trackerDay.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
        db.ktEntry.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 12 }),
        db.bonusUnlock.findMany({ where: { userId } }),
      ])

    const ktHistory = ktRows.map((e) => ({ date: e.createdAt.toISOString(), kt: e.kt }))
    const lastKtEntry = ktRows.at(-1) || null

    // Bonus progress over the trailing 30 days
    const cutoff = Date.now() - 30 * 86400000
    const ktEntriesRecent = ktHistory
      .filter((e) => new Date(e.date).getTime() >= cutoff)
      .map((e) => ({ kt: e.kt }))
    const trackerCountRecent = trackerRows.filter(
      (r) => new Date(r.date).getTime() >= cutoff,
    ).length
    const bonusProgress = evaluateBonus({ ktEntriesRecent, trackerCountRecent })

    return {
      subscription: {
        active: !!sub?.active,
        expiresAt: sub?.expiresAt ? sub.expiresAt.toISOString() : null,
      },
      unlockedPractices: unlockedRows.map((r) => r.practiceId),
      completedPractices: completions.map((r) => r.practiceId),
      trackerDays: trackerRows.map((r) => r.date.toISOString().slice(0, 10)),
      lastDeepAnalysisDate: lastKtEntry ? lastKtEntry.createdAt.toISOString() : null,
      lastKT: lastKtEntry ? lastKtEntry.kt : null,
      ktHistory,
      bonusUnlocked: bonusRows.map((r) => r.practiceId),
      bonusProgress,
    }
  })
}
