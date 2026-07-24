import { db } from '../../db.js'
import { config } from '../../config.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'
import { isAllowedImage, saveImageStream, deleteAudioFile } from '../../utils/media.js'

const AUDIENCES = ['all', 'paid', 'free']
const CHANNELS = ['email', 'telegram']

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
    const { subject, body, audience } = req.body
    const channel = req.body.channel || 'email'
    const imageUrl = channel === 'telegram' ? (req.body.imageUrl || null) : null
    // Считаем потенциальную аудиторию заранее — сколько улетит.
    const where = buildAudienceWhere(audience, channel)
    const totalCount = await db.user.count({ where })

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
    const totalCount = await db.user.count({
      where: buildAudienceWhere(req.body.audience, req.body.channel || 'email'),
    })
    return { totalCount }
  })
}

export function buildAudienceWhere(audience, channel = 'email') {
  // Базовое: наличие канала доставки. email → нужен email, telegram → tgUserId.
  const base = channel === 'telegram'
    ? { tgUserId: { not: null } }
    : { email: { not: null } }
  if (audience === 'all') return base
  if (audience === 'paid') {
    return { ...base, subscription: { active: true } }
  }
  if (audience === 'free') {
    return { ...base, OR: [{ subscription: null }, { subscription: { active: false } }] }
  }
  return base
}
