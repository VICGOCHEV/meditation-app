import { db } from '../db.js'
import { todayDateOnly } from '../utils/dateHelpers.js'
import { nextAwarenessUnlock } from '../utils/progressionRules.js'

export async function practicesRoutes(app) {
  // POST /api/practices/:id/complete
  // Помимо отметки прохождения и трекер-дня — пересчитывает, можно ли
  // открыть следующую awareness. Условия задаются клиентом 2026-05-20:
  // 4 дня + предыдущая completed + трекер-марк + mid-DA (для a4).
  app.post('/practices/:id/complete', {
    preHandler: app.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', minLength: 1, maxLength: 200 } },
      },
    },
  }, async (req) => {
    const userId = req.user.id
    const practiceId = req.params.id

    await db.practiceCompletion.upsert({
      where: { userId_practiceId: { userId, practiceId } },
      create: { userId, practiceId, positionSec: 0 },
      update: { completedAt: new Date() },
    })

    const today = todayDateOnly()
    await db.trackerDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    })

    // После записи completion+tracker сразу проверяем,
    // открывается ли следующая awareness.
    const [unlockedRows, completions, trackerDays, ktCount] = await Promise.all([
      db.unlockedAwareness.findMany({ where: { userId }, orderBy: { unlockedAt: 'asc' } }),
      db.practiceCompletion.findMany({ where: { userId }, select: { practiceId: true } }),
      db.trackerDay.findMany({ where: { userId }, select: { date: true } }),
      db.ktEntry.count({ where: { userId } }),
    ])
    const completedSet = new Set(completions.map((r) => r.practiceId))
    const trackerSet = new Set(trackerDays.map((r) => r.date.toISOString().slice(0, 10)))
    const next = nextAwarenessUnlock({
      unlockedRows,
      completedSet,
      trackerSet,
      ktCount,
    })
    let newlyUnlockedId = null
    if (next.id) {
      await db.unlockedAwareness.create({
        data: { userId, practiceId: next.id },
      })
      newlyUnlockedId = next.id
    }

    return {
      ok: true,
      practiceId,
      trackerDate: today.toISOString().slice(0, 10),
      newlyUnlockedId,
      nextReason: next.reason,
    }
  })
}
