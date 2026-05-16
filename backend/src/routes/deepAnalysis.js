import { db } from '../db.js'
import { calcIT, calcIO, calcKT } from '../utils/scoreCalc.js'
import {
  AWARENESS_ORDER,
  BONUS_IDS,
  nextAwareness,
  evaluateBonus,
} from '../utils/progressionRules.js'

export async function deepAnalysisRoutes(app) {
  app.post('/deep-analysis', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['answers'],
        properties: {
          answers: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 10 },
            minItems: 10,
            maxItems: 10,
          },
          IT: { type: 'number' },
          IO: { type: 'number' },
          KT: { type: 'number' },
        },
      },
    },
  }, async (req) => {
    const userId = req.user.id
    const { answers } = req.body
    const IT = calcIT(...answers.slice(0, 5))
    const IO = calcIO(...answers.slice(5, 10))
    const KT = calcKT(IO, IT)

    await db.ktEntry.create({
      data: { userId, it: IT, io: IO, kt: KT, answers },
    })

    // Unlock next awareness practice
    const unlockedRows = await db.unlockedAwareness.findMany({ where: { userId } })
    const unlockedSet = new Set(unlockedRows.map((r) => r.practiceId))
    const newlyUnlockedId = nextAwareness(unlockedSet)
    if (newlyUnlockedId) {
      await db.unlockedAwareness.create({
        data: { userId, practiceId: newlyUnlockedId },
      })
    }

    // Bonus eligibility — re-evaluate over trailing 30 days, then grant
    // any missing au1/au2 ids.
    const cutoff = Date.now() - 30 * 86400000
    const recentKt = await db.ktEntry.findMany({
      where: { userId, createdAt: { gte: new Date(cutoff) } },
      select: { kt: true },
    })
    const recentTracker = await db.trackerDay.count({
      where: { userId, date: { gte: new Date(cutoff) } },
    })
    const bonus = evaluateBonus({
      ktEntriesRecent: recentKt,
      trackerCountRecent: recentTracker,
    })
    let newlyUnlockedBonus = []
    if (bonus.eligible) {
      const already = new Set(
        (await db.bonusUnlock.findMany({ where: { userId } })).map((r) => r.practiceId),
      )
      newlyUnlockedBonus = BONUS_IDS.filter((id) => !already.has(id))
      if (newlyUnlockedBonus.length) {
        await db.bonusUnlock.createMany({
          data: newlyUnlockedBonus.map((practiceId) => ({ userId, practiceId })),
        })
      }
    }

    return {
      ok: true,
      IT,
      IO,
      KT,
      newlyUnlockedId,
      newlyUnlockedBonus,
    }
  })
}
