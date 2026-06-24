import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import { BLOCK_DEFAULTS, BLOCK_KEYS, mergeBlock } from '../../utils/blockDefaults.js'

// CMS: заголовки секций блоков на главной (eyebrow/title/sub/chip). key
// структурный и не редактируется — меняем только тексты. Аппка читает их
// из публичного /api/content/blocks, поэтому правки видны без деплоя.
export async function adminBlocksRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/blocks → { items: [{key, eyebrow, title, sub, chip, order}] }
  // Всегда возвращает все известные блоки (несохранённые — с дефолтами).
  app.get('/admin/blocks', async () => {
    const rows = await db.blockMeta.findMany()
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    const items = BLOCK_KEYS.map((key) => mergeBlock(key, byKey[key]))
    items.sort((a, b) => a.order - b.order)
    return { items }
  })

  // PUT /api/admin/blocks/:key → upsert текстов одного блока.
  app.put('/admin/blocks/:key', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          eyebrow: { type: 'string', maxLength: 120 },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          sub: { type: 'string', maxLength: 600 },
          chip: { type: 'string', maxLength: 120 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { key } = req.params
    if (!BLOCK_KEYS.includes(key)) {
      return reply.code(404).send({ error: 'Неизвестный блок' })
    }
    const d = BLOCK_DEFAULTS[key]
    // Пустую строку трактуем как «нет значения» → null (секция упадёт на
    // дефолт при отдаче). title обязателен, поэтому пустой не пускаем.
    const norm = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
    const data = {
      eyebrow: norm(req.body.eyebrow),
      title: req.body.title.trim(),
      sub: norm(req.body.sub),
      chip: norm(req.body.chip),
    }
    const row = await db.blockMeta.upsert({
      where: { key },
      create: { key, order: d?.order ?? 0, ...data },
      update: data,
    })
    return { block: mergeBlock(key, row) }
  })
}
