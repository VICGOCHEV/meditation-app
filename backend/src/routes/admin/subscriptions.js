import { db } from '../../db.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'

const ONE_MONTH_MS = 30 * 86400000
const VALID_TIERS = ['awareness', 'all-inclusive']

// Управление подписками вручную (саппорт/тест-доступы). Только role: admin.
export async function adminSubscriptionsRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)
  app.addHook('preHandler', requireAdmin)

  // POST /api/admin/users/:id/subscription/grant { tier?, months? }
  // Выдать/продлить. Продлевает от текущего expiresAt, если он в будущем.
  app.post('/admin/users/:id/subscription/grant', {
    schema: {
      body: {
        type: 'object',
        properties: {
          tier: { type: 'string', enum: VALID_TIERS },
          months: { type: 'integer', minimum: 1, maximum: 36 },
        },
      },
    },
  }, async (req, reply) => {
    const userId = Number(req.params.id)
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'Юзер не найден' })

    const tier = VALID_TIERS.includes(req.body?.tier) ? req.body.tier : 'awareness'
    const months = req.body?.months || 1
    const now = new Date()
    const sub = await db.subscription.findUnique({ where: { userId } })
    const base = sub?.active && sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now
    const expiresAt = new Date(base.getTime() + months * ONE_MONTH_MS)

    await db.subscription.upsert({
      where: { userId },
      create: { userId, active: true, expiresAt, tier },
      update: { active: true, expiresAt, tier },
    })
    // Открытие первой awareness убрано 2026-07-30: доступ к практикам больше
    // не зависит от подписки, цепочка открывается прослушиванием
    // (utils/progressionRules.js). Роут оставлен для учёта/отката.

    return { ok: true, tier, expiresAt: expiresAt.toISOString() }
  })

  // POST /api/admin/users/:id/subscription/revoke — снять active (expiresAt оставляем).
  app.post('/admin/users/:id/subscription/revoke', async (req, reply) => {
    const userId = Number(req.params.id)
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'Юзер не найден' })
    await db.subscription.updateMany({ where: { userId }, data: { active: false } })
    return { ok: true }
  })
}
