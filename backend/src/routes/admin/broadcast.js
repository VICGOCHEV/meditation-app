import { db } from '../../db.js'
import { config } from '../../config.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'
import { isAllowedImage, saveImageStream, deleteAudioFile } from '../../utils/media.js'

const AUDIENCES = ['all', 'paid', 'free']
const CHANNELS = ['email', 'telegram']

// С 2026-07-30 подписок нет (docs/38), и сегментация paid/free для Telegram
// потеряла смысл: аудитория пушей — подписчики бота (TgSubscriber), у которых
// в большинстве вообще нет аккаунта, а значит и Subscription. Раньше выбор
// «С подпиской» давал 0 получателей, воркер не находил кого слать и молча
// помечал рассылку `done` — админ видел «готово» при нуле доставок.
// Нормализуем аудиторию TG в 'all' и на входе в API, и в preview, чтобы
// сохранённый в job `audience` совпадал с тем, по чему считался охват.
function normalizeAudience(audience, channel) {
  return channel === 'telegram' ? 'all' : audience
}

// Абсолютный публичный базовый URL (для картинок, которые Telegram подтягивает
// сам через sendPhoto). Берём из TG_MINI_APP_URL / PUBLIC_APP_URL.
function publicBase() {
  const raw = process.env.PUBLIC_APP_URL || process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru'
  return raw.replace(/\/+$/, '')
}

/**
 * Управление массовыми рассылками — email (фирменные письма) и Telegram
 * (пуши об оффлайн-мероприятиях, опционально с картинкой).
 * Создание мгновенное (status=pending) — реальная отправка идёт в воркере
 * `broadcastWorker.js`, чтобы не блокировать админский UI и не ловить лимиты.
 */
export async function adminBroadcastRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)
  app.addHook('preHandler', requireAdmin)

  // POST /api/admin/broadcasts { subject, body, audience, channel?, imageUrl? }
  app.post('/admin/broadcasts', {
    schema: {
      body: {
        type: 'object',
        required: ['subject', 'body', 'audience'],
        properties: {
          subject: { type: 'string', minLength: 3, maxLength: 200 },
          body: { type: 'string', minLength: 1, maxLength: 5000 },
          audience: { type: 'string', enum: AUDIENCES },
          channel: { type: 'string', enum: CHANNELS },
          imageUrl: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (req, reply) => {
    const { subject, body } = req.body
    const channel = req.body.channel || 'email'
    const audience = normalizeAudience(req.body.audience, channel)
    const imageUrl = channel === 'telegram' ? (req.body.imageUrl || null) : null
    // Считаем потенциальную аудиторию заранее — сколько улетит.
    const totalCount = await countAudience(audience, channel)

    // Пустая аудитория — это ошибка ввода, а не «успешная рассылка на ноль».
    // Раньше такой job создавался, воркер сразу ставил ему `done`, и в CMS
    // это выглядело как отправленная рассылка.
    if (totalCount === 0) {
      return reply.code(400).send({
        error: channel === 'telegram'
          ? 'Некому отправлять: ни одного активного подписчика бота'
          : 'Некому отправлять: нет получателей с email для этой аудитории',
      })
    }

    const job = await db.broadcastJob.create({
      data: {
        subject,
        body,
        audience,
        channel,
        imageUrl,
        totalCount,
        status: 'pending',
        createdBy: req.admin.id,
      },
    })
    return { ok: true, job }
  })

  // POST /api/admin/broadcasts/image — загрузка картинки для telegram-пуша.
  // Возвращает абсолютный https-URL (Telegram подтягивает картинку сам).
  app.post('/admin/broadcasts/image', async (req, reply) => {
    const part = await req.file()
    if (!part) return reply.code(400).send({ error: 'Файл не передан' })
    if (!isAllowedImage(part.mimetype)) {
      return reply.code(415).send({ error: 'Только картинка (jpg, png, webp)' })
    }
    let saved
    try {
      saved = await saveImageStream(part.file, part.mimetype)
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'Не удалось сохранить картинку' })
    }
    if (part.file.truncated) {
      await deleteAudioFile(saved.filename)
      const mb = Math.round(config.maxAudioBytes / 1024 / 1024)
      return reply.code(413).send({ error: `Файл больше ${mb} МБ` })
    }
    // Общий multipart-лимит рассчитан на аудио (60 МБ), а Telegram принимает
    // фото байтами только до 10 МБ. Без этой проверки картинка спокойно
    // загрузилась бы, рассылка создалась — и все отправки упали бы.
    if (saved.sizeBytes > config.maxImageBytes) {
      await deleteAudioFile(saved.filename)
      const mb = Math.round(config.maxImageBytes / 1024 / 1024)
      return reply.code(413).send({
        error: `Картинка больше ${mb} МБ — Telegram такую не примет`,
      })
    }
    const url = `${publicBase()}${config.mediaUrlBase}/${saved.filename}`
    return { ok: true, url }
  })

  // GET /api/admin/broadcasts — список всех рассылок (для CMS)
  app.get('/admin/broadcasts', async () => {
    const jobs = await db.broadcastJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { jobs }
  })

  // GET /api/admin/broadcasts/:id — детали одной (для пуллинга прогресса)
  app.get('/admin/broadcasts/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const job = await db.broadcastJob.findUnique({ where: { id } })
    if (!job) return reply.code(404).send({ error: 'not found' })
    return { job }
  })

  // POST /api/admin/broadcasts/preview — сколько улетит при такой аудитории/канале
  app.post('/admin/broadcasts/preview', {
    schema: {
      body: {
        type: 'object',
        required: ['audience'],
        properties: {
          audience: { type: 'string', enum: AUDIENCES },
          channel: { type: 'string', enum: CHANNELS },
        },
      },
    },
  }, async (req) => {
    const channel = req.body.channel || 'email'
    const totalCount = await countAudience(normalizeAudience(req.body.audience, channel), channel)
    return { totalCount }
  })
}

// Email-аудитория — по таблице User (нужен email + фильтр по подписке).
export function buildEmailWhere(audience) {
  const base = { email: { not: null } }
  if (audience === 'paid') return { ...base, subscription: { active: true } }
  if (audience === 'free') {
    return { ...base, OR: [{ subscription: null }, { subscription: { active: false } }] }
  }
  return base
}

// Telegram-аудитория — все включённые подписчики бота, «все, кто в боте».
//
// Сегментация paid/free здесь убрана намеренно (см. normalizeAudience выше):
// подписок с 2026-07-30 нет, `Subscription.active` в БД больше не отражает
// доступ, а bot-only подписчики аккаунта не имеют вовсе. Параметр оставлен в
// сигнатуре, чтобы не трогать вызовы в broadcastWorker и старые job'ы с
// audience='paid'/'free' в истории обрабатывались одинаково.
// Email-сегментация (buildEmailWhere) не меняется — там paid/free всё ещё
// осмысленны для истории платежей.
export function buildTgSubscriberWhere(_audience) {
  return { enabled: true }
}

// Универсальный подсчёт охвата по каналу.
export function countAudience(audience, channel = 'email') {
  return channel === 'telegram'
    ? db.tgSubscriber.count({ where: buildTgSubscriberWhere(audience) })
    : db.user.count({ where: buildEmailWhere(audience) })
}
