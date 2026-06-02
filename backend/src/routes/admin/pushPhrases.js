import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'

// CMS: тексты пушей. Notifier (backend/src/jobs/notifier.js) каждую минуту
// читает active фразы из этой таблицы и выбирает случайную для (slot, audience).
// Клиент может править фразы без деплоя — изменения подхватываются на лету.

const SLOTS = ['08:00', '12:00', '16:00', '20:00']
const AUDIENCES = ['free', 'paid']

function form(p) {
  return {
    id: p.id,
    slot: p.slot,
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

  // GET /api/admin/push-phrases?slot=08:00&audience=paid
  // Без фильтров — все фразы, отсортированы по (audience, slot, order).
  app.get('/admin/push-phrases', async (req) => {
    const where = {}
    if (typeof req.query?.slot === 'string' && SLOTS.includes(req.query.slot)) {
      where.slot = req.query.slot
    }
    if (typeof req.query?.audience === 'string' && AUDIENCES.includes(req.query.audience)) {
      where.audience = req.query.audience
    }
    const rows = await db.pushPhrase.findMany({
      where,
      orderBy: [{ audience: 'asc' }, { slot: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    })
    return { items: rows.map(form) }
  })

  const phraseProps = {
    slot:     { type: 'string', enum: SLOTS },
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
        required: ['slot', 'audience', 'text'],
        properties: phraseProps,
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const b = req.body
    // order по умолчанию — в конец группы (slot+audience)
    const last = await db.pushPhrase.findFirst({
      where: { slot: b.slot, audience: b.audience },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const created = await db.pushPhrase.create({
      data: {
        slot: b.slot,
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
    for (const k of ['slot', 'audience', 'text', 'order', 'active']) {
      if (k in req.body) data[k] = req.body[k]
    }
    const updated = await db.pushPhrase.update({ where: { id }, data })
    return { phrase: form(updated) }
  })

  // POST /api/admin/push-phrases/reorder — {slot, audience, orderedIds: [id,...]}
  app.post('/admin/push-phrases/reorder', {
    schema: {
      body: {
        type: 'object',
        required: ['slot', 'audience', 'orderedIds'],
        properties: {
          slot: { type: 'string', enum: SLOTS },
          audience: { type: 'string', enum: AUDIENCES },
          orderedIds: { type: 'array', items: { type: 'integer' }, maxItems: 500 },
        },
      },
    },
  }, async (req) => {
    const { orderedIds } = req.body
    await db.$transaction(
      orderedIds.map((id, i) =>
        db.pushPhrase.update({ where: { id }, data: { order: i } }),
      ),
    )
    return { ok: true }
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
