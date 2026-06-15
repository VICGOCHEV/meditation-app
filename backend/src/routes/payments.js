import { db } from '../db.js'
import { createPayment, getPayment } from '../utils/yookassa.js'
import { resolvePromoCode } from './promocodes.js'

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
            promoCode: { type: 'string', maxLength: 60 },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.user.id
      const { tier, promoCode } = req.body
      const t = TIERS[tier]
      let amount = t.amount
      let promoMetadata = {}

      // Если юзер ввёл промокод — проверяем и применяем.
      // Промокод НЕ помечается как использованный здесь — это происходит
      // в webhook'е после payment.succeeded, чтобы юзер не «спалил» код,
      // оставив неоплаченный платёж висеть.
      if (promoCode) {
        const promo = await resolvePromoCode(promoCode, { userId, tier })
        if (!promo || promo.error) {
          return reply.code(400).send({
            error: promo?.error || 'Промокод не найден',
          })
        }
        amount = promo.finalRub
        promoMetadata = { promoCode: promo.promo.code, promoPercent: String(promo.percent) }
      }

      // ЮKassa не принимает amount = 0. Если 100%-промокод даёт бесплатно —
      // активируем подписку напрямую, без захода в ЮKassa.
      if (amount === 0) {
        try {
          const ONE_MONTH_MS_LOCAL = 30 * 86400000
          const now = new Date()
          const sub = await db.subscription.findUnique({ where: { userId } })
          const base = sub?.active && sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now
          const expiresAt = new Date(base.getTime() + ONE_MONTH_MS_LOCAL)
          await db.subscription.upsert({
            where: { userId },
            create: { userId, active: true, expiresAt, tier, expirationNotifiedAt: null },
            update: { active: true, expiresAt, tier, expirationNotifiedAt: null },
          })
          await db.unlockedAwareness.upsert({
            where: { userId_practiceId: { userId, practiceId: 'a1' } },
            create: { userId, practiceId: 'a1' },
            update: {},
          })
          // Пометить промокод как использованный
          const promo = await db.promoCode.findUnique({ where: { code: promoMetadata.promoCode } })
          if (promo) {
            await db.promoCodeUse.create({
              data: { promoCodeId: promo.id, userId, discountKopecks: t.amount * 100 },
            })
            await db.promoCode.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            })
          }
          return { ok: true, freeActivation: true }
        } catch (err) {
          app.log.error({ err: err.message }, 'free-promo activation failed')
          return reply.code(500).send({ error: 'Не удалось активировать подписку' })
        }
      }

      try {
        const payment = await createPayment({
          amount,
          description: t.description,
          metadata: { userId: String(userId), tier, ...promoMetadata },
        })
        return {
          ok: true,
          paymentId: payment.id,
          confirmationToken: payment.confirmation?.confirmation_token,
          finalAmount: amount,
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

      // Лог транзакции — пишем ДО апдейта подписки. Идемпотентно по
      // yookassaId: если ЮKassa зачем-то ретранслировала webhook —
      // upsert не создаст дубликата.
      try {
        const amountKopecks = Math.round(parseFloat(actual.amount?.value || '0') * 100)
        const paidAt = actual.captured_at ? new Date(actual.captured_at) : new Date()
        await db.payment.upsert({
          where: { yookassaId: actual.id },
          create: {
            yookassaId: actual.id,
            userId,
            amount: amountKopecks,
            currency: actual.amount?.currency || 'RUB',
            tier,
            status: actual.status,
            paidAt,
          },
          update: { status: actual.status },
        })
      } catch (logErr) {
        // Не блокируем активацию подписки, если лог не записался.
        app.log.warn({ err: logErr.message, paymentId: actual.id }, 'payment log upsert failed')
      }

      // Активируем (или продлеваем) подписку. Логика как в POST /subscription.
      const now = new Date()
      const sub = await db.subscription.findUnique({ where: { userId } })
      const base = sub?.active && sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now
      const expiresAt = new Date(base.getTime() + ONE_MONTH_MS)

      await db.subscription.upsert({
        where: { userId },
        create: { userId, active: true, expiresAt, tier, expirationNotifiedAt: null },
        update: { active: true, expiresAt, tier, expirationNotifiedAt: null },
      })

      // Если платёж шёл с промокодом — отмечаем его как использованный.
      // Делаем это здесь (а не при создании платежа), чтобы не «спалить»
      // промокод на брошенный платёж.
      const promoCodeStr = actual.metadata?.promoCode
      if (promoCodeStr) {
        try {
          const promo = await db.promoCode.findUnique({ where: { code: promoCodeStr } })
          if (promo) {
            const baseAmount = TIERS[tier]?.amount || 0
            const finalAmount = Math.round(parseFloat(actual.amount?.value || '0'))
            await db.promoCodeUse.upsert({
              where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
              create: {
                promoCodeId: promo.id,
                userId,
                discountKopecks: Math.max(0, (baseAmount - finalAmount) * 100),
                paymentId: actual.id,
              },
              update: { paymentId: actual.id },
            })
            await db.promoCode.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            })
          }
        } catch (e) {
          app.log.warn({ err: e?.message, code: promoCodeStr }, 'promo use upsert failed')
        }
      }

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
