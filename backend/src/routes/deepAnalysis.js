import { db } from '../db.js'
import { calcIT, calcIO, calcKT } from '../utils/scoreCalc.js'

// DA-test: записывает KT-замер. По решению клиента (2026-05-20) DA больше
// НЕ открывает следующую awareness и НЕ грантит бонусные авторские —
// бонусная механика снята полностью. Awareness открывается отдельно
// (см. progressionRules.canUnlockNextAwareness, дёргается из
// `practices/:id/complete`). DA теперь — измерительный инструмент
// (3 чекпоинта: старт блока / середина / финал), а не геймификация.

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

    return { ok: true, IT, IO, KT }
  })
}
