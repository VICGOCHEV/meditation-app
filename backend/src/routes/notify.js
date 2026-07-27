import crypto from 'node:crypto'
import { db } from '../db.js'
import { verifyTgInitData } from '../utils/platformAuth.js'
import { parsePhases } from '../utils/pushPhases.js'

// GET  /api/notify/prefs       — текущие настройки юзера (или дефолты)
// PATCH /api/notify/prefs      — обновить enabled / timezone
// POST /api/notify/tg-link     — сгенерить deep-link для привязки Telegram
// POST /api/notify/tg-capture  — привязать tgUserId по initData Mini App (авто)
// POST /api/notify/test        — отправить себе тестовый пуш прямо сейчас

const BOT_USERNAME = process.env.TG_BOT_USERNAME || 'Pause_relax_bot'
const LINK_TTL_MS = 15 * 60 * 1000 // код живёт 15 минут
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

      // Зеркалим настройки в подписчика бота (если аккаунт привязан): тумблер
      // «Напоминания» и таймзона из апп — авторитетны для доставки пушей.
      const mirror = {}
      if (typeof data.enabled === 'boolean') mirror.enabled = data.enabled
      if (typeof data.timezone === 'string') mirror.timezone = data.timezone
      if (Object.keys(mirror).length) {
        await db.tgSubscriber.updateMany({
          where: { userId: req.user.id },
          data: mirror,
        })
      }

      return {
        ok: true,
        enabled: prefs.enabled,
        timezone: prefs.timezone,
      }
    }
  )

  // Привязка Telegram для пушей. Генерим одноразовый код, кладём на юзера,
  // возвращаем deep-link на бота. Юзер жмёт Start → бот получает
  // /start link_<code> → webhook (routes/tg.js) находит юзера по коду и
  // проставляет tgUserId. Работает и для PWA-юзеров вне Telegram.
  app.post('/notify/tg-link', async (req) => {
    const code = crypto.randomBytes(9).toString('base64url') // ~12 url-safe символов
    const exp = new Date(Date.now() + LINK_TTL_MS)
    await db.user.update({
      where: { id: req.user.id },
      data: { tgLinkCode: code, tgLinkCodeExp: exp },
    })
    // Гарантируем NotifyPrefs(enabled=true) заранее — чтобы сразу после
    // привязки первый же слот отстрелил, без лишнего клика по тумблеру.
    await db.notifyPrefs.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, enabled: true },
      update: {},
    })
    return {
      deepLink: `https://t.me/${BOT_USERNAME}?start=link_${code}`,
      botUsername: BOT_USERNAME,
    }
  })

  // Авто-привязка Telegram при запуске Mini App. Фронт после рендера тихо
  // шлёт сюда WebApp.initData (fire-and-forget). Мы проверяем HMAC-подпись
  // через TG_BOT_TOKEN и проставляем tgUserId ТЕКУЩЕМУ залогиненному юзеру —
  // это чинит «пуши доходят только разработчику» без единого клика юзера и
  // без изменения момента старта приложения. Работает только внутри Telegram
  // (в PWA/браузере initData пустой — фронт сюда не ходит).
  app.post(
    '/notify/tg-capture',
    {
      schema: {
        body: {
          type: 'object',
          required: ['initData'],
          properties: { initData: { type: 'string', maxLength: 4096 } },
        },
      },
    },
    async (req, reply) => {
      const botToken = process.env.TG_BOT_TOKEN
      if (!botToken) return reply.code(503).send({ error: 'TG bot не сконфигурирован' })

      const tgUser = verifyTgInitData(req.body.initData, botToken)
      if (!tgUser?.id) return reply.code(401).send({ error: 'Невалидная подпись initData' })

      const tgId = BigInt(tgUser.id)
      const me = await db.user.findUnique({
        where: { id: req.user.id },
        select: { tgUserId: true },
      })

      // tgId — это и chat_id приватного чата с ботом: делаем юзера подписчиком.
      const prefsTz = (await db.notifyPrefs.findUnique({
        where: { userId: req.user.id },
        select: { enabled: true, timezone: true },
      }))

      // Апсерт подписчика бота: chat_id = tgId, привязка к аккаунту. Сначала
      // снимаем userId с любого другого подписчика этого аккаунта (userId @unique).
      async function linkSubscriber(tx) {
        await tx.tgSubscriber.updateMany({
          where: { userId: req.user.id, chatId: { not: tgId } },
          data: { userId: null },
        })
        await tx.tgSubscriber.upsert({
          where: { chatId: tgId },
          create: {
            chatId: tgId,
            userId: req.user.id,
            enabled: prefsTz?.enabled ?? true,
            timezone: prefsTz?.timezone ?? 'Europe/Moscow',
          },
          update: { userId: req.user.id },
        })
      }

      // Уже привязан к этому же tg — только гарантируем NotifyPrefs + подписчика.
      if (me?.tgUserId != null && me.tgUserId === tgId) {
        await db.$transaction(async (tx) => {
          await tx.notifyPrefs.upsert({
            where: { userId: req.user.id },
            create: { userId: req.user.id, enabled: true },
            update: {},
          })
          await linkSubscriber(tx)
        })
        return { ok: true, linked: true, already: true }
      }

      await db.$transaction(async (tx) => {
        // Если этот tgUserId висит на другом аккаунте (авто-шелл старого
        // /auth/tg-init) — отвязываем, иначе упрёмся в unique-constraint.
        const holder = await tx.user.findUnique({ where: { tgUserId: tgId } })
        if (holder && holder.id !== req.user.id) {
          await tx.user.update({ where: { id: holder.id }, data: { tgUserId: null } })
        }
        await tx.user.update({ where: { id: req.user.id }, data: { tgUserId: tgId } })
        await tx.notifyPrefs.upsert({
          where: { userId: req.user.id },
          create: { userId: req.user.id, enabled: true },
          update: {},
        })
        await linkSubscriber(tx)
      })

      return { ok: true, linked: true }
    }
  )

  // Тест-пуш — даёт юзеру убедиться что пуши доходят. Берёт случайную фразу
  // фазы «день» (нейтральная); если таких нет — любую active для аудитории.
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

    const all = await db.pushPhrase.findMany({ where: { audience, active: true } })
    const dayPhrases = all.filter((p) => parsePhases(p.phases).includes('day'))
    const phrases = dayPhrases.length ? dayPhrases : all
    if (!phrases.length) return reply.code(500).send({ error: 'фразы не настроены' })

    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

    try {
      const { sendMessage } = await import('../utils/tgBot.js')
      await sendMessage(Number(u.tgUserId), `Тест-пуш\n\n${phrase.text}`, {
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
