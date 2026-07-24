import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { PHASE_KEYS, parsePhases, serializePhases } from '../../utils/pushPhases.js'

// CMS: тексты пушей на «начало практики». Notifier (backend/src/jobs/notifier.js)
// каждую минуту читает active-фразы и для наступившей фазы дня (утро/день/вечер)
// выбирает случайную из (phase, audience). Клиент правит фразы и фазы (чекбоксы)
// без деплоя — изменения подхватываются на лету.

const AUDIENCES = ['free', 'paid']

function form(p) {
  return {
    id: p.id,
    phases: parsePhases(p.phases),
    audience: p.audience,
    text: p.text,
    order: p.order,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export async function adminPushPhrasesRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/push-phrases?audience=paid
  // Без фильтров — все фразы, отсортированы по (audience, order).
  app.get('/admin/push-phrases', async (req) => {
    const where = {}
    if (typeof req.query?.audience === 'string' && AUDIENCES.includes(req.query.audience)) {
      where.audience = req.query.audience
    }
    const rows = await db.pushPhrase.findMany({
      where,
      orderBy: [{ audience: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    })
    return { items: rows.map(form) }
  })

  const phraseProps = {
    phases:   { type: 'array', items: { type: 'string', enum: PHASE_KEYS }, minItems: 1, maxItems: 3 },
    audience: { type: 'string', enum: AUDIENCES },
    text:     { type: 'string', minLength: 1, maxLength: 2000 },
    order:    { type: 'integer', minimum: 0 },
    active:   { type: 'boolean' },
  }

  // POST /api/admin/push-phrases
  app.post('/admin/push-phrases', {
    schema: {
      body: {
        type: 'object',
        required: ['phases', 'audience', 'text'],
        properties: phraseProps,
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const b = req.body
    const phases = serializePhases(b.phases)
    if (!phases) return reply.code(400).send({ error: 'Выбери хотя бы одну фазу дня' })
    // order по умолчанию — в конец группы (audience)
    const last = await db.pushPhrase.findFirst({
      where: { audience: b.audience },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const created = await db.pushPhrase.create({
      data: {
        phases,
        audience: b.audience,
        text: b.text,
        order: b.order ?? (last ? last.order + 1 : 0),
        active: b.active ?? true,
      },
    })
    return { phrase: form(created) }
  })

  // PUT /api/admin/push-phrases/:id
  app.put('/admin/push-phrases/:id', {
    schema: {
      body: {
        type: 'object',
        properties: phraseProps,
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.pushPhrase.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Фраза не найдена' })
    const data = {}
    if ('phases' in req.body) {
      const phases = serializePhases(req.body.phases)
      if (!phases) return reply.code(400).send({ error: 'Выбери хотя бы одну фазу дня' })
      data.phases = phases
    }
    for (const k of ['audience', 'text', 'order', 'active']) {
      if (k in req.body) data[k] = req.body[k]
    }
    const updated = await db.pushPhrase.update({ where: { id }, data })
    return { phrase: form(updated) }
  })

  // DELETE /api/admin/push-phrases/:id
  app.delete('/admin/push-phrases/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.pushPhrase.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Фраза не найдена' })
    await db.pushPhrase.delete({ where: { id } })
    return { ok: true }
  })
}
