import { db } from '../db.js'
import { todayDateOnly } from '../utils/dateHelpers.js'

export async function practicesRoutes(app) {
  // POST /api/practices/:id/complete
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
    const trackerResult = await db.trackerDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    })

    return { ok: true, practiceId, trackerDate: today.toISOString().slice(0, 10) }
  })
}
