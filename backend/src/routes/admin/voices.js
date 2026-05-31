import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { voiceInclude } from '../../utils/contentShape.js'
import { toPublicMedia } from '../../utils/media.js'

function form(v) {
  return {
    id: v.id,
    name: v.name,
    code: v.code,
    active: v.active,
    order: v.order,
    audioFull: toPublicMedia(v.audioFull),
    audioPreview: toPublicMedia(v.audioPreview),
  }
}

const props = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  code: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 50 },
  audioFullId: { type: 'integer' },
  audioPreviewId: { type: 'integer' },
  active: { type: 'boolean' },
  order: { type: 'integer', minimum: 0 },
}

export async function adminVoicesRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  app.get('/admin/voices', async () => {
    const rows = await db.voice.findMany({ include: voiceInclude, orderBy: { order: 'asc' } })
    return { items: rows.map(form) }
  })

  app.post('/admin/voices', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'code', 'audioFullId', 'audioPreviewId'],
        properties: props,
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const b = req.body
    const dup = await db.voice.findUnique({ where: { code: b.code } })
    if (dup) return reply.code(409).send({ error: `Код «${b.code}» уже занят` })
    const last = await db.voice.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
    const created = await db.voice.create({
      data: {
        name: b.name,
        code: b.code,
        audioFullId: b.audioFullId,
        audioPreviewId: b.audioPreviewId,
        active: b.active ?? true,
        order: b.order ?? (last ? last.order + 1 : 0),
      },
      include: voiceInclude,
    })
    return { voice: form(created) }
  })

  app.put('/admin/voices/:id', {
    schema: { body: { type: 'object', properties: props, additionalProperties: false } },
  }, async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.voice.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Голос не найден' })
    const b = req.body
    if (b.code && b.code !== existing.code) {
      const dup = await db.voice.findUnique({ where: { code: b.code } })
      if (dup) return reply.code(409).send({ error: `Код «${b.code}» уже занят` })
    }
    const data = {}
    for (const k of Object.keys(props)) if (k in b) data[k] = b[k]
    const updated = await db.voice.update({ where: { id }, data, include: voiceInclude })
    return { voice: form(updated) }
  })

  app.post('/admin/voices/reorder', {
    schema: {
      body: {
        type: 'object',
        required: ['orderedIds'],
        properties: { orderedIds: { type: 'array', items: { type: 'integer' }, maxItems: 100 } },
      },
    },
  }, async (req) => {
    await db.$transaction(
      req.body.orderedIds.map((id, i) => db.voice.update({ where: { id }, data: { order: i } })),
    )
    return { ok: true }
  })

  app.delete('/admin/voices/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.voice.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Голос не найден' })
    await db.voice.delete({ where: { id } })
    return { ok: true }
  })
}
