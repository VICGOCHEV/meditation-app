import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { musicInclude } from '../../utils/contentShape.js'
import { toPublicMedia } from '../../utils/media.js'

function form(m) {
  return {
    id: m.id,
    title: m.title,
    active: m.active,
    order: m.order,
    audioFull: toPublicMedia(m.audioFull),
    audioPreview: toPublicMedia(m.audioPreview),
  }
}

const props = {
  title: { type: 'string', minLength: 1, maxLength: 100 },
  audioFullId: { type: 'integer' },
  audioPreviewId: { type: 'integer' },
  active: { type: 'boolean' },
  order: { type: 'integer', minimum: 0 },
}

export async function adminMusicRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  app.get('/admin/music', async () => {
    const rows = await db.musicTrack.findMany({ include: musicInclude, orderBy: { order: 'asc' } })
    return { items: rows.map(form) }
  })

  app.post('/admin/music', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'audioFullId', 'audioPreviewId'],
        properties: props,
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const b = req.body
    const last = await db.musicTrack.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
    const created = await db.musicTrack.create({
      data: {
        title: b.title,
        audioFullId: b.audioFullId,
        audioPreviewId: b.audioPreviewId,
        active: b.active ?? true,
        order: b.order ?? (last ? last.order + 1 : 0),
      },
      include: musicInclude,
    })
    return { track: form(created) }
  })

  app.put('/admin/music/:id', {
    schema: { body: { type: 'object', properties: props, additionalProperties: false } },
  }, async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.musicTrack.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Трек не найден' })
    const data = {}
    for (const k of Object.keys(props)) if (k in req.body) data[k] = req.body[k]
    const updated = await db.musicTrack.update({ where: { id }, data, include: musicInclude })
    return { track: form(updated) }
  })

  // POST /api/admin/music/reorder — порядок треков задаёт id 1/2/3 на фронте.
  app.post('/admin/music/reorder', {
    schema: {
      body: {
        type: 'object',
        required: ['orderedIds'],
        properties: { orderedIds: { type: 'array', items: { type: 'integer' }, maxItems: 100 } },
      },
    },
  }, async (req) => {
    await db.$transaction(
      req.body.orderedIds.map((id, i) => db.musicTrack.update({ where: { id }, data: { order: i } })),
    )
    return { ok: true }
  })

  app.delete('/admin/music/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.musicTrack.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Трек не найден' })
    await db.musicTrack.delete({ where: { id } })
    return { ok: true }
  })
}
