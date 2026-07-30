import { db } from '../db.js'

// ─────────────────────────────────────────────────────────────────────────────
// ПОДПИСКА ОТКЛЮЧЕНА — решение клиента 2026-07-30 (docs/38).
// Весь контент бесплатный, доступ открывается прослушиванием предыдущей
// практики (см. utils/progressionRules.js). Продать/активировать подписку
// из приложения больше нельзя.
//
// Роут НЕ удалён намеренно: старые собранные клиенты (PWA в кэше, не
// обновившийся VK/TG Mini App) продолжают его дёргать, и им нужен внятный
// ответ вместо 404. Плюс это точка отката, если решение отменят.
// ─────────────────────────────────────────────────────────────────────────────

export async function subscriptionRoutes(app) {
  // POST /api/subscription — больше не активирует ничего.
  app.post('/subscription', { preHandler: app.authenticate }, async (_req, reply) => {
    return reply.code(410).send({
      error: 'Подписка отключена: все практики доступны бесплатно',
      code: 'subscription-disabled',
    })
  })

  // DELETE /api/subscription — оставлен рабочим: у части юзеров в БД лежит
  // active=true с прошлой механики, и снять флаг должно быть можно.
  app.delete('/subscription', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id
    await db.subscription.updateMany({ where: { userId }, data: { active: false } })
    return { ok: true }
  })
}
