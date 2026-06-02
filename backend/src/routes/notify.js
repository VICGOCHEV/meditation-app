import { db } from '../db.js'

// GET  /api/notify/prefs       — текущие настройки юзера (или дефолты)
// PATCH /api/notify/prefs      — обновить enabled / timezone
// POST /api/notify/test        — отправить себе тестовый пуш прямо сейчас
//
// Все эндпоинты требуют auth (поле req.user.id заполняется через jwtVerify
// в preHandler). НЕ требуем active subscription — настройки и тест-пуш
// работают для всех залогиненных юзеров (включая бесплатных).

const VALID_TZ = (tz) => {
  try {
    // Intl бросит RangeError на левой строке
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function notifyRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  app.get('/notify/prefs', async (req) => {
    const prefs = await db.notifyPrefs.findUnique({ where: { userId: req.user.id } })
    return {
      enabled: prefs?.enabled ?? true,
      timezone: prefs?.timezone ?? 'Europe/Moscow',
      hasTg: !!(await db.user.findUnique({
        where: { id: req.user.id },
        select: { tgUserId: true },
      }))?.tgUserId,
    }
  })

  app.patch(
    '/notify/prefs',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            timezone: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async (req, reply) => {
      const data = {}
      if (typeof req.body.enabled === 'boolean') data.enabled = req.body.enabled
      if (typeof req.body.timezone === 'string') {
        if (!VALID_TZ(req.body.timezone)) {
          return reply.code(400).send({ error: 'неизвестный часовой пояс' })
        }
        data.timezone = req.body.timezone
      }
      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ error: 'нечего обновлять' })
      }

      // Если меняется тумблер на off, сбрасываем lastSlotKey — при следующем
      // вкл первая возможная фраза снова отстреливает.
      if (data.enabled === false) data.lastSlotKey = null

      const prefs = await db.notifyPrefs.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, ...data },
        update: data,
      })
      return {
        ok: true,
        enabled: prefs.enabled,
        timezone: prefs.timezone,
      }
    }
  )

  // Тест-пуш — даёт юзеру убедиться что пуши доходят. Берёт случайную фразу
  // для слота 12:00 (default) — короткая и нейтральная.
  app.post('/notify/test', async (req, reply) => {
    const u = await db.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: true },
    })
    if (!u?.tgUserId) {
      return reply
        .code(400)
        .send({ error: 'Зайди в приложение через Telegram, чтобы получать пуши' })
    }

    const now = new Date()
    const isPaid =
      u.subscription?.active === true &&
      (!u.subscription.expiresAt || u.subscription.expiresAt > now)
    const audience = isPaid ? 'paid' : 'free'

    const phrases = await db.pushPhrase.findMany({
      where: { slot: '12:00', audience, active: true },
    })
    if (!phrases.length) return reply.code(500).send({ error: 'фразы не настроены' })

    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

    try {
      const { sendMessage } = await import('../utils/tgBot.js')
      await sendMessage(Number(u.tgUserId), `🧪 Тест-пуш\n\n${phrase.text}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть приложение', web_app: { url: MINI_APP_URL } }],
          ],
        },
      })
      return { ok: true }
    } catch (e) {
      app.log.warn({ err: e.message }, 'test push failed')
      return reply.code(502).send({ error: 'Не получилось отправить — попробуй позже' })
    }
  })
}
