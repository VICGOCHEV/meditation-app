import { db } from '../db.js'

// Сетка тарифов — должна совпадать с payments.js. Через import коды
// сцеплялись бы кругово, поэтому копия (3 строки).
const TIER_AMOUNTS = {
  awareness: 199,
  'all-inclusive': 299,
}

/**
 * Возвращает запись PromoCode по коду, или null если код невалидный.
 * Не выбрасывает — все проверки тут.
 */
export async function resolvePromoCode(code, { userId, tier } = {}) {
  if (!code) return null
  const upper = String(code).trim().toUpperCase()
  if (!upper) return null
  const promo = await db.promoCode.findUnique({ where: { code: upper } })
  if (!promo) return null
  if (!promo.active) return { error: 'Промокод отключён' }
  const now = new Date()
  if (promo.validFrom && promo.validFrom > now) return { error: 'Промокод ещё не активен' }
  if (promo.validUntil && promo.validUntil < now) return { error: 'Промокод истёк' }
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    return { error: 'Промокод уже использован полностью' }
  }
  // Проверка «один юзер — один раз»
  if (userId) {
    const already = await db.promoCodeUse.findUnique({
      where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
    })
    if (already) return { error: 'Ты уже использовал этот промокод' }
  }

  // Считаем итоговую цену
  const baseRub = TIER_AMOUNTS[tier] || TIER_AMOUNTS.awareness
  const discountRub = Math.floor((baseRub * promo.percent) / 100)
  const finalRub = Math.max(0, baseRub - discountRub)

  return {
    promo,
    baseRub,
    discountRub,
    finalRub,
    percent: promo.percent,
  }
}

export async function promocodeRoutes(app) {
  // POST /api/promocode/validate { code, tier }
  // Юзер вводит код на /subscription, мы проверяем и возвращаем итоговую цену.
  // НЕ помечает код как использованный — это происходит только после
  // успешного payment.succeeded в webhook'е.
  app.post('/promocode/validate', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', maxLength: 60 },
          tier: { type: 'string', enum: Object.keys(TIER_AMOUNTS) },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.user.id
    const tier = req.body.tier || 'awareness'
    const result = await resolvePromoCode(req.body.code, { userId, tier })
    if (!result) return reply.code(404).send({ error: 'Промокод не найден' })
    if (result.error) return reply.code(400).send({ error: result.error })
    return {
      ok: true,
      code: result.promo.code,
      percent: result.percent,
      baseRub: result.baseRub,
      discountRub: result.discountRub,
      finalRub: result.finalRub,
    }
  })
}
