import { createPayment } from '../utils/yookassa.js'

// ─────────────────────────────────────────────────────────────────────────────
// ДОБРОВОЛЬНЫЙ ДОНАТ — решение клиента 2026-07-30 (docs/38).
//
// Донат живёт ТОЛЬКО на внешней странице https://all-relaxme.ru/donate/,
// вне Mini App. Причина — правила ВК (письмо модерации 2026-07-30):
//   • п. 5.4.1 — на клиентах iOS/Android не должно быть ни оплаты, ни уводов
//     или подсказок, как и где оплатить, даже текстом;
//   • п. 5.4.2 — принимать оплату можно только одобренными ВК способами,
//     ЮKassa в их число не входит.
// Поэтому кнопка доната не рендерится внутри VK-запуска (см.
// application/src/lib/platform.js), а сама форма вынесена за пределы Mini App.
//
// Донат ничего не открывает и ни к чему не привязан: анонимный платёж,
// без JWT. Успешные донаты пишутся в таблицу Donation через общий
// webhook ЮKassa (routes/payments.js, metadata.kind = 'donate').
// ─────────────────────────────────────────────────────────────────────────────

const MIN_RUB = 50
const MAX_RUB = 30000

export async function donationRoutes(app) {
  // POST /api/donate/create { amount } → { confirmationToken }
  // Публичный: страница доната не знает про юзеров и не требует входа.
  app.post(
    '/donate/create',
    {
      config: {
        // Отдельный, более узкий лимит поверх глобального 120/мин: создание
        // платежей — дорогая операция на стороне ЮKassa.
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'integer', minimum: MIN_RUB, maximum: MAX_RUB },
          },
        },
      },
    },
    async (req, reply) => {
      const { amount } = req.body
      try {
        const payment = await createPayment({
          amount,
          description: 'Добровольная поддержка проекта Relax Me',
          metadata: { kind: 'donate' },
        })
        return {
          ok: true,
          paymentId: payment.id,
          confirmationToken: payment.confirmation?.confirmation_token,
          amount,
        }
      } catch (err) {
        app.log.error({ err: err.message }, 'donation create failed')
        return reply.code(502).send({ error: 'Не удалось создать платёж' })
      }
    }
  )
}
