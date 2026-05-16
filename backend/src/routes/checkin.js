import { db } from '../db.js'
import { calcIS } from '../utils/scoreCalc.js'

export async function checkinRoutes(app) {
  app.post('/checkin', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['q1', 'q2', 'q3', 'q4'],
        properties: {
          q1: { type: 'integer', minimum: 0, maximum: 10 },
          q2: { type: 'integer', minimum: 0, maximum: 10 },
          q3: { type: 'integer', minimum: 0, maximum: 10 },
          q4: { type: 'integer', minimum: 0, maximum: 10 },
        },
      },
    },
  }, async (req) => {
    const userId = req.user.id
    const { q1, q2, q3, q4 } = req.body
    const IS = calcIS(q1, q2, q3, q4)
    await db.checkin.create({
      data: { userId, q1, q2, q3, q4, is_: IS },
    })
    return { ok: true, IS }
  })
}
