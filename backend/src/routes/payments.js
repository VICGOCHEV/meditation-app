import { db } from '../db.js'
import { createPayment, getPayment } from '../utils/yookassa.js'

// Сетка тарифов — должна совпадать с фронтом (Subscription.jsx).
const TIERS = {
  awareness: { amount: 199, description: 'Подписка «Осознанность»' },
  'all-inclusive': { amount: 299, description: 'Подписка «Всё включено»' },
}

const ONE_MONTH_MS = 30 * 86400000

export async function paymentRoutes(app) {
  // POST /api/payments/yookassa/create {tier}
  // Возвращает confirmation_token для embedded-виджета. Платёж создан
  // в ЮKassa, ждёт оплаты — активация подписки происходит в webhook'е.
  app.post(
    '/payments/yookassa/create',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['tier'],
          properties: {
            tier: { type: 'string', enum: Object.keys(TIERS) },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.user.id
      const { tier } = req.body
      const t = TIERS[tier]
      try {
        const payment = await createPayment({
          amount: t.amount,
          description: t.description,
          metadata: { userId: String(userId), tier },
        })
        return {
          ok: true,
          paymentId: payment.id,
          confirmationToken: payment.confirmation?.confirmation_token,
        }
      } catch (err) {
        app.log.error({ err: err.message }, 'YooKassa create failed')
        return reply.code(502).send({ error: 'ЮKassa: ' + err.message })
      }
    }
  )

  // POST /api/payments/yookassa/webhook
  // Принимает события от ЮKassa. На payment.succeeded — активирует подписку
  // юзера по metadata.userId.
  //
  // ВАЖНО: webhook публичный (нет JWT). Защита — мы перед активацией
  // дёргаем getPayment(id) и проверяем status='succeeded' напрямую через
  // ЮKassa API. Это предотвращает подделку события: атакующий не может
  // создать notification с фейковым payment.id, потому что getPayment
  // вернёт 404 или другой статус.
  app.post('/payments/yookassa/webhook', async (req, reply) => {
    const event = req.body
    const eventType = event?.event
    const paymentObj = event?.object

    if (eventType !== 'payment.succeeded' || !paymentObj?.id) {
      return { ok: true, ignored: true }
    }

    try {
      // Верификация через API: запрашиваем платёж напрямую.
      const actual = await getPayment(paymentObj.id)
      if (actual.status !== 'succeeded') {
        return { ok: true, ignored: 'not-actually-succeeded' }
      }

      const userId = parseInt(actual.metadata?.userId || '0', 10)
      const tier = actual.metadata?.tier
      if (!userId || !TIERS[tier]) {
        app.log.warn({ paymentId: paymentObj.id }, 'webhook без userId/tier в metadata')
        return { ok: true, ignored: 'bad-metadata' }
      }

      // Активируем (или продлеваем) подписку. Логика как в POST /subscription.
      const now = new Date()
      const sub = await db.subscription.findUnique({ where: { userId } })
      const base = sub?.active && sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now
      const expiresAt = new Date(base.getTime() + ONE_MONTH_MS)

      await db.subscription.upsert({
        where: { userId },
        create: { userId, active: true, expiresAt, tier },
        update: { active: true, expiresAt, tier },
      })

      // Auto-unlock первой awareness-практики
      await db.unlockedAwareness.upsert({
        where: { userId_practiceId: { userId, practiceId: 'a1' } },
        create: { userId, practiceId: 'a1' },
        update: {},
      })

      app.log.info({ userId, tier, paymentId: paymentObj.id }, 'subscription activated')
      return { ok: true, activated: true }
    } catch (err) {
      app.log.error({ err: err.message }, 'YooKassa webhook failed')
      // Возвращаем 200, чтобы ЮKassa не повторяла webhook — лог есть, разберём.
      return { ok: true, error: err.message }
    }
  })
}
