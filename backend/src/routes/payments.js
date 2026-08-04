import { db } from '../db.js'
import { createPayment, getPayment } from '../utils/yookassa.js'
import { resolvePromoCode } from './promocodes.js'

// Сетка тарифов — должна совпадать с фронтом (Subscription.jsx).
const TIERS = {
  awareness: { amount: 199, description: 'Подписка «Осознанность»' },
  'all-inclusive': { amount: 299, description: 'Подписка «Всё включено»' },
}

const ONE_MONTH_MS = 30 * 86400000

// ─────────────────────────────────────────────────────────────────────────────
// ПРОДАЖА ПОДПИСКИ ОТКЛЮЧЕНА — решение клиента 2026-07-30 (docs/38).
// Создание платежей из приложения запрещено; webhook оставлен рабочим, чтобы
// корректно закрыть платежи, созданные до выкатки, и не потерять их в логе.
// Добровольные донаты живут отдельно — routes/donations.js + страница /donate/.
// ─────────────────────────────────────────────────────────────────────────────
const SALES_DISABLED = true

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
      if (SALES_DISABLED) {
        return reply.code(410).send({
          error: 'Оплата отключена: все практики доступны бесплатно',
          code: 'sales-disabled',
        })
      }
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
          // a1 здесь больше НЕ открываем: доступ к практикам с 2026-07-30
          // не зависит от оплаты (см. utils/progressionRules.js).
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

      // Добровольный донат со страницы /donate/ — не привязан к юзеру и
      // ничего не открывает. Пишем в лог донатов и выходим.
      if (actual.metadata?.kind === 'donate') {
        const amountKopecks = Math.round(parseFloat(actual.amount?.value || '0') * 100)
        await db.donation.upsert({
          where: { yookassaId: actual.id },
          create: {
            yookassaId: actual.id,
            amount: amountKopecks,
            currency: actual.amount?.currency || 'RUB',
            status: actual.status,
            paidAt: actual.captured_at ? new Date(actual.captured_at) : new Date(),
          },
          update: { status: actual.status },
        })
        app.log.info({ paymentId: actual.id, amountKopecks }, 'donation received')
        return { ok: true, donation: true }
      }

      const userId = parseInt(actual.metadata?.userId || '0', 10)
      const tier = actual.metadata?.tier
      if (!userId || !TIERS[tier]) {
        app.log.warn({ paymentId: paymentObj.id }, 'webhook без userId/tier в metadata')
        return { ok: true, ignored: 'bad-metadata' }
      }

      // ── Идемпотентность ──────────────────────────────────────────────────
      // Payment.yookassaId уникален и служит отметкой «этот платёж уже
      // обработан». До появления ретраев (webhook всегда отвечал 200) повтор
      // был невозможен, поэтому отметки и не требовалось. Теперь ретраи есть,
      // и без неё повторная доставка продлила бы подписку ещё на месяц и
      // второй раз списала лимит промокода.
      const already = await db.payment.findUnique({ where: { yookassaId: actual.id } })
      if (already) {
        app.log.info({ paymentId: actual.id, userId }, 'webhook duplicate ignored')
        return { ok: true, duplicate: true }
      }

      const amountKopecks = Math.round(parseFloat(actual.amount?.value || '0') * 100)
      const paidAt = actual.captured_at ? new Date(actual.captured_at) : new Date()

      // Отметка и активация — ОДНОЙ транзакцией.
      //
      // Порознь их разводить нельзя: если записать Payment, а потом упасть на
      // Subscription, то ретрай от ЮKassa увидит отметку, посчитает событие
      // обработанным и выйдет — деньги списаны, подписка не активирована, и
      // починить это можно только руками. В транзакции падение откатывает и
      // отметку, поэтому повторная доставка честно проходит путь заново.
      try {
        await db.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              yookassaId: actual.id,
              userId,
              amount: amountKopecks,
              currency: actual.amount?.currency || 'RUB',
              tier,
              status: actual.status,
              paidAt,
            },
          })

          // Активируем (или продлеваем) подписку. Логика как в POST /subscription.
          const now = new Date()
          const sub = await tx.subscription.findUnique({ where: { userId } })
          const base = sub?.active && sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now
          const expiresAt = new Date(base.getTime() + ONE_MONTH_MS)

          await tx.subscription.upsert({
            where: { userId },
            create: { userId, active: true, expiresAt, tier, expirationNotifiedAt: null },
            update: { active: true, expiresAt, tier, expirationNotifiedAt: null },
          })
        })
      } catch (e) {
        // P2002 — параллельная доставка того же события успела записать первой.
        // Это дубликат, а не сбой: выходим без второй активации.
        if (e?.code === 'P2002') {
          app.log.info({ paymentId: actual.id, userId }, 'webhook duplicate ignored (race)')
          return { ok: true, duplicate: true }
        }
        throw e
      }

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
            // usedCount инкрементим ТОЛЬКО вместе с созданием записи об
            // использовании, одной транзакцией. Прежний код делал upsert и
            // инкремент по отдельности: повторный webhook (а с ретраями он
            // теперь реален) наращивал счётчик, и лимит промокода сгорал
            // впустую — следующим пользователям код отказывал.
            await db.$transaction(async (tx) => {
              const existing = await tx.promoCodeUse.findUnique({
                where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
              })
              if (existing) {
                if (!existing.paymentId) {
                  await tx.promoCodeUse.update({
                    where: { id: existing.id },
                    data: { paymentId: actual.id },
                  })
                }
                return
              }
              await tx.promoCodeUse.create({
                data: {
                  promoCodeId: promo.id,
                  userId,
                  discountKopecks: Math.max(0, (baseAmount - finalAmount) * 100),
                  paymentId: actual.id,
                },
              })
              await tx.promoCode.update({
                where: { id: promo.id },
                data: { usedCount: { increment: 1 } },
              })
            })
          }
        } catch (e) {
          // Гонка двух доставок: unique(promoCodeId,userId) откатит транзакцию
          // целиком — вместе с инкрементом. Это ожидаемо, не ошибка.
          if (e?.code !== 'P2002') {
            app.log.warn({ err: e?.message, code: promoCodeStr }, 'promo use upsert failed')
          }
        }
      }

      // Auto-unlock первой awareness-практики снят: с 2026-07-30 открытие
      // практик не связано с оплатой (см. utils/progressionRules.js).

      app.log.info({ userId, tier, paymentId: paymentObj.id }, 'subscription activated')
      return { ok: true, activated: true }
    } catch (err) {
      app.log.error(
        { err: err.message, stack: err.stack, paymentId: paymentObj.id },
        'YooKassa webhook failed'
      )
      // 5xx, чтобы ЮKassa повторила доставку. Раньше здесь возвращался 200:
      // ЮKassa считала событие доставленным и больше не приходила, а платёж
      // оставался необработанным — подписка не активировалась, донат не
      // попадал в учёт, и восстановить это можно было только руками по логам.
      //
      // Сюда попадают только НЕОЖИДАННЫЕ сбои (сеть до ЮKassa, недоступная
      // БД). Штатные «не наше событие» и «плохая metadata» отвечают 200 выше
      // по коду — на них ретрай бессмысленен.
      //
      // Повторная обработка безопасна: отметка по Payment.yookassaId и
      // upsert донатов по тому же ключу делают webhook идемпотентным.
      throw app.httpErrors.serviceUnavailable('webhook processing failed')
    }
  })
}
