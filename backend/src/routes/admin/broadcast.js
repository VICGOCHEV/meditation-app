import { db } from '../../db.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'

const AUDIENCES = ['all', 'paid', 'free']

/**
 * Управление массовыми email-рассылками.
 * Создание мгновенное (status=pending) — реальная отправка идёт в воркере
 * `broadcastWorker.js`, чтобы не блокировать админский UI и не ловить
 * SMTP-лимиты (Selectel ~30 писем/мин).
 */
export async function adminBroadcastRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)
  app.addHook('preHandler', requireAdmin)

  // POST /api/admin/broadcasts { subject, body, audience }
  app.post('/admin/broadcasts', {
    schema: {
      body: {
        type: 'object',
        required: ['subject', 'body', 'audience'],
        properties: {
          subject: { type: 'string', minLength: 3, maxLength: 200 },
          body: { type: 'string', minLength: 10, maxLength: 5000 },
          audience: { type: 'string', enum: AUDIENCES },
        },
      },
    },
  }, async (req, reply) => {
    const { subject, body, audience } = req.body
    // Считаем потенциальную аудиторию заранее, чтобы клиент видел сколько улетит.
    const where = buildAudienceWhere(audience)
    const totalCount = await db.user.count({ where })

    const job = await db.broadcastJob.create({
      data: {
        subject,
        body,
        audience,
        totalCount,
        status: 'pending',
        createdBy: req.admin.id,
      },
    })
    return { ok: true, job }
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

  // POST /api/admin/broadcasts/preview — узнать сколько улетит при такой аудитории
  app.post('/admin/broadcasts/preview', {
    schema: {
      body: {
        type: 'object',
        required: ['audience'],
        properties: { audience: { type: 'string', enum: AUDIENCES } },
      },
    },
  }, async (req) => {
    const totalCount = await db.user.count({ where: buildAudienceWhere(req.body.audience) })
    return { totalCount }
  })
}

export function buildAudienceWhere(audience) {
  // Базовое: только юзеры с email (без email слать некуда).
  const base = { email: { not: null } }
  if (audience === 'all') return base
  if (audience === 'paid') {
    return { ...base, subscription: { active: true } }
  }
  if (audience === 'free') {
    return { ...base, OR: [{ subscription: null }, { subscription: { active: false } }] }
  }
  return base
}
