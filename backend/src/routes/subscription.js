import { db } from '../db.js'

const ONE_MONTH_MS = 30 * 86400000

export async function subscriptionRoutes(app) {
  // POST /api/subscription — activate / extend by 30 days
  app.post('/subscription', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id
    const now = new Date()
    const sub = await db.subscription.findUnique({ where: { userId } })
    const base = sub?.active && sub.expiresAt && sub.expiresAt > now
      ? sub.expiresAt
      : now
    const expiresAt = new Date(base.getTime() + ONE_MONTH_MS)

    await db.subscription.upsert({
      where: { userId },
      create: { userId, active: true, expiresAt },
      update: { active: true, expiresAt },
    })

    // Auto-unlock first awareness practice on activation
    await db.unlockedAwareness.upsert({
      where: { userId_practiceId: { userId, practiceId: 'a1' } },
      create: { userId, practiceId: 'a1' },
      update: {},
    })

    return { ok: true, expiresAt: expiresAt.toISOString() }
  })

  // DELETE /api/subscription — flip active=false, keep expiresAt
  app.delete('/subscription', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id
    await db.subscription.updateMany({ where: { userId }, data: { active: false } })
    return { ok: true }
  })
}
