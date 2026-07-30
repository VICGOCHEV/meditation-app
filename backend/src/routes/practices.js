import { db } from '../db.js'
import { todayDateOnly } from '../utils/dateHelpers.js'
import { nextUnlock } from '../utils/progressionRules.js'
import { loadChain } from '../utils/practiceChain.js'

export async function practicesRoutes(app) {
  // POST /api/practices/:id/complete
  // Отмечает прохождение + трекер-день и сразу проверяет, открывается ли
  // следующая практика. Единственное условие открытия (редакция клиента
  // 2026-07-30) — полное прослушивание предыдущей; для входа в цепочку
  // нужно прослушать весь бесплатный блок «Точка тишины».
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

    const [unlockedRows, completions, chain] = await Promise.all([
      db.unlockedAwareness.findMany({ where: { userId }, select: { practiceId: true } }),
      db.practiceCompletion.findMany({ where: { userId }, select: { practiceId: true } }),
      loadChain(),
    ])
    const unlockedSet = new Set(unlockedRows.map((r) => r.practiceId))
    const completedSet = new Set(completions.map((r) => r.practiceId))

    const next = nextUnlock({ chain, unlockedSet, completedSet })
    let newlyUnlockedId = null
    if (next.id) {
      // upsert, а не create: два параллельных complete'а одной практики
      // (offline-очередь + повтор) не должны падать на unique-констрейнте.
      await db.unlockedAwareness.upsert({
        where: { userId_practiceId: { userId, practiceId: next.id } },
        create: { userId, practiceId: next.id },
        update: {},
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
