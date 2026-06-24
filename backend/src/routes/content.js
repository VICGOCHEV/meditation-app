import { db } from '../db.js'
import {
  practiceInclude,
  voiceInclude,
  musicInclude,
  practicePublicForm,
  voicePublicForm,
  musicPublicForm,
} from '../utils/contentShape.js'
import { BLOCK_KEYS, mergeBlock } from '../utils/blockDefaults.js'

// Публичный контент для аппки — замена Strapi REST. Отдаёт ту же форму,
// что парсил src/api/cms.js, поэтому фронт переключается сменой VITE_CMS_URL
// (на /api) без правки логики. Кэш-заголовок мягкий: контент меняется редко.
export async function contentRoutes(app) {
  const cache = (reply) => reply.header('Cache-Control', 'public, max-age=60')

  // GET /api/content/practices → { relaxation:[...], awareness:[...], author:[...] }
  app.get('/content/practices', async (_req, reply) => {
    cache(reply)
    const rows = await db.practice.findMany({
      where: { published: true },
      include: practiceInclude,
      orderBy: { order: 'asc' },
    })
    const groups = { relaxation: [], awareness: [], awareness2: [], author: [] }
    for (const p of rows) {
      if (!groups[p.block]) continue
      groups[p.block].push(practicePublicForm(p))
    }
    return groups
  })

  // GET /api/content/blocks → { relaxation:{eyebrow,title,sub,chip,order}, ... }
  // Заголовки секций главной. Аппка использует их вместо хардкода; CMS «Блоки»
  // их правит. Отсутствующие в БД ключи падают на дефолт.
  app.get('/content/blocks', async (_req, reply) => {
    cache(reply)
    const rows = await db.blockMeta.findMany()
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    const out = {}
    for (const key of BLOCK_KEYS) out[key] = mergeBlock(key, byKey[key])
    return out
  })

  // GET /api/content/practices/:slug → одна практика (по публичному slug)
  app.get('/content/practices/:slug', async (req, reply) => {
    const p = await db.practice.findFirst({
      where: { slug: req.params.slug, published: true },
      include: practiceInclude,
    })
    if (!p) return reply.code(404).send({ error: 'not found' })
    cache(reply)
    return practicePublicForm(p)
  })

  // GET /api/content/voices → [{ id:code, name, fullUrl, previewUrl, active }]
  app.get('/content/voices', async (_req, reply) => {
    cache(reply)
    const rows = await db.voice.findMany({
      where: { active: true },
      include: voiceInclude,
      orderBy: { order: 'asc' },
    })
    return rows.map(voicePublicForm)
  })

  // GET /api/content/music → [{ id:1..n, title, fullUrl, previewUrl }]
  app.get('/content/music', async (_req, reply) => {
    cache(reply)
    const rows = await db.musicTrack.findMany({
      where: { active: true },
      include: musicInclude,
      orderBy: { order: 'asc' },
    })
    return rows.map(musicPublicForm)
  })
}
