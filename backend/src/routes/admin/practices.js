import crypto from 'node:crypto'
import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import {
  AUDIO_CELLS,
  practiceInclude,
  practiceAdminForm,
} from '../../utils/contentShape.js'
import { BLOCK_KEYS } from '../../utils/blockDefaults.js'

// Единый источник списка блоков — blockDefaults.js (relaxation | awareness |
// awareness2 | author). Раньше тут был отдельный хардкод, из-за чего новый
// блок не проходил валидацию схемы (Bad Request на сохранении).
const BLOCKS = BLOCK_KEYS

// Транслит для читаемого slug. Slug = публичный id практики в аппке
// (PracticeCompletion.practiceId), поэтому стабильный и уникальный.
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-',
}
function slugify(title) {
  const base = String(title || '')
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : /[a-z0-9-]/.test(ch) ? ch : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${base || 'practice'}-${crypto.randomBytes(2).toString('hex')}`
}

// Достаёт из body карту cell-key → mediaId|null и кладёт в data по idField.
function audioDataFromBody(body, { fillMissing = false } = {}) {
  const audio = body?.audio || {}
  const data = {}
  for (const c of AUDIO_CELLS) {
    const key = `${c.voice}_music${c.music}`
    if (key in audio) {
      const v = audio[key]
      data[c.idField] = v == null || v === '' ? null : Number(v)
    } else if (fillMissing) {
      data[c.idField] = null
    }
  }
  return data
}

// Пересчитывает длительность практики из первой непустой дорожки.
async function computeDuration(idMap) {
  const ids = AUDIO_CELLS.map((c) => idMap[c.idField]).filter(Boolean)
  if (!ids.length) return 0
  const media = await db.mediaFile.findMany({
    where: { id: { in: ids } },
    select: { id: true, durationSec: true },
  })
  const byId = new Map(media.map((m) => [m.id, m.durationSec]))
  for (const c of AUDIO_CELLS) {
    const id = idMap[c.idField]
    if (id && byId.get(id)) return byId.get(id)
  }
  return 0
}

const baseFieldsSchema = {
  title: { type: 'string', minLength: 1, maxLength: 200 },
  block: { type: 'string', enum: BLOCKS },
  description: { type: ['string', 'null'], maxLength: 2000 },
  price: { type: ['integer', 'null'], minimum: 0 },
  monthSlot: { type: ['integer', 'null'], minimum: 0 },
  order: { type: 'integer', minimum: 0 },
  published: { type: 'boolean' },
  audio: { type: 'object' },
}

export async function adminPracticesRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/practices — все практики (плоский список, SPA группирует).
  app.get('/admin/practices', async () => {
    const rows = await db.practice.findMany({
      include: practiceInclude,
      orderBy: [{ block: 'asc' }, { order: 'asc' }],
    })
    return { items: rows.map(practiceAdminForm) }
  })

  // GET /api/admin/practices/:id
  app.get('/admin/practices/:id', async (req, reply) => {
    const row = await db.practice.findUnique({
      where: { id: Number(req.params.id) },
      include: practiceInclude,
    })
    if (!row) return reply.code(404).send({ error: 'Практика не найдена' })
    return { practice: practiceAdminForm(row) }
  })

  // POST /api/admin/practices — создать. Минимум: title + block.
  // Остальное (включая пустую матрицу) появляется по умолчанию.
  app.post('/admin/practices', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'block'],
        properties: baseFieldsSchema,
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const b = req.body
    const audioData = audioDataFromBody(b, { fillMissing: true })
    const durationSec = await computeDuration(audioData)

    // order по умолчанию — в конец блока
    const last = await db.practice.findFirst({
      where: { block: b.block },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const created = await db.practice.create({
      data: {
        slug: slugify(b.title),
        title: b.title,
        block: b.block,
        description: b.description ?? null,
        price: b.price ?? null,
        monthSlot: b.monthSlot ?? null,
        order: b.order ?? (last ? last.order + 1 : 0),
        published: b.published ?? false,
        durationSec,
        ...audioData,
      },
      include: practiceInclude,
    })
    return { practice: practiceAdminForm(created) }
  })

  // PUT /api/admin/practices/:id — обновить поля и/или матрицу.
  app.put('/admin/practices/:id', {
    schema: {
      body: {
        type: 'object',
        properties: baseFieldsSchema,
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.practice.findUnique({
      where: { id },
      include: practiceInclude,
    })
    if (!existing) return reply.code(404).send({ error: 'Практика не найдена' })

    const b = req.body
    const audioData = audioDataFromBody(b) // только переданные ячейки

    // итоговая карта id всех ячеек (старое + патч) — для пересчёта длительности
    const merged = {}
    for (const c of AUDIO_CELLS) {
      merged[c.idField] = c.idField in audioData ? audioData[c.idField] : existing[c.idField]
    }
    const durationSec = await computeDuration(merged)

    const data = { durationSec, ...audioData }
    for (const k of ['title', 'block', 'description', 'price', 'monthSlot', 'order', 'published']) {
      if (k in b) data[k] = b[k]
    }

    const updated = await db.practice.update({
      where: { id },
      data,
      include: practiceInclude,
    })
    return { practice: practiceAdminForm(updated) }
  })

  // POST /api/admin/practices/reorder — { block, orderedIds: [id,...] }
  app.post('/admin/practices/reorder', {
    schema: {
      body: {
        type: 'object',
        required: ['orderedIds'],
        properties: {
          block: { type: 'string', enum: BLOCKS },
          orderedIds: { type: 'array', items: { type: 'integer' }, maxItems: 500 },
        },
      },
    },
  }, async (req) => {
    const { orderedIds } = req.body
    await db.$transaction(
      orderedIds.map((id, i) =>
        db.practice.update({ where: { id }, data: { order: i } }),
      ),
    )
    return { ok: true }
  })

  // DELETE /api/admin/practices/:id
  app.delete('/admin/practices/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const existing = await db.practice.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Практика не найдена' })
    await db.practice.delete({ where: { id } })
    return { ok: true }
  })
}
