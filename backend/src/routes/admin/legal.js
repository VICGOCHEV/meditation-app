import { db } from '../../db.js'
import { config } from '../../config.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'
import { getSetting, setSetting } from '../../utils/appSettings.js'
import { isAllowedPdf, savePdfStream, deleteAudioFile } from '../../utils/media.js'
import {
  LIMITS,
  LEGAL_REQUISITES_KEY,
  LEGAL_REQUISITES_DEFAULT,
  legalAdminForm,
  normStr,
  validateSlug,
} from '../../utils/legalDocs.js'

// CMS: юридические документы (оферта, политика конфиденциальности, согласие
// на ОПД и любые новые). Раньше это были три PDF, вкомпилированных в бандл
// фронта — правка требовала деплоя. Теперь владелец правит текст сам, а
// аппка читает документы из публичного /api/content/legal.
//
// Права: создание и правка — editor (это контент). Удаление документа —
// только admin: снос юр. документа деструктивен и с юридическими
// последствиями, как выдача подписки или удаление админа.
export async function adminLegalRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // Общая сборка полей из тела запроса. `patch` = true для PUT: не переданное
  // поле не трогаем; для POST — недостающее падает на дефолт.
  function buildData(body, { patch }) {
    const data = {}
    const setIf = (key, value) => {
      if (value !== undefined) data[key] = value
    }
    if (typeof body.title === 'string') data.title = body.title.trim()
    setIf('shortTitle', body.shortTitle === undefined ? undefined : normStr(body.shortTitle))
    setIf('version', body.version === undefined ? undefined : normStr(body.version))
    // Пустой body — валидное состояние: «документ ведём файлом, не текстом».
    if (typeof body.body === 'string') data.body = body.body
    for (const flag of ['published', 'showInFooter', 'showAtSignup']) {
      if (typeof body[flag] === 'boolean') data[flag] = body[flag]
    }
    if (!patch) {
      if (data.body === undefined) data.body = ''
      if (data.shortTitle === undefined) data.shortTitle = null
      if (data.version === undefined) data.version = null
    }
    return data
  }

  function validate(body, { requireTitle }) {
    if (requireTitle && !(typeof body.title === 'string' && body.title.trim())) {
      return 'Название обязательно'
    }
    if (typeof body.title === 'string' && body.title.trim().length > LIMITS.title) {
      return `Название: больше ${LIMITS.title} символов`
    }
    if (typeof body.shortTitle === 'string' && body.shortTitle.length > LIMITS.shortTitle) {
      return `Короткое название: больше ${LIMITS.shortTitle} символов`
    }
    if (typeof body.version === 'string' && body.version.length > LIMITS.version) {
      return `Редакция: больше ${LIMITS.version} символов`
    }
    if (typeof body.body === 'string' && body.body.length > LIMITS.body) {
      return `Текст документа: больше ${LIMITS.body} символов`
    }
    return null
  }

  // GET /api/admin/legal → { items: [...], requisites }
  app.get('/admin/legal', async () => {
    const rows = await db.legalDoc.findMany({
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    })
    return {
      // В списке body не нужен и может весить сотни килобайт на документ.
      items: rows.map((r) => ({ ...legalAdminForm(r), body: undefined })),
      requisites: await getSetting(LEGAL_REQUISITES_KEY, LEGAL_REQUISITES_DEFAULT),
    }
  })

  // PUT /api/admin/legal/requisites { requisites }
  // Объявлен до /:id — статический сегмент в роутере Fastify приоритетнее,
  // но держим рядом с остальными «не-CRUD» ручками для читаемости.
  app.put('/admin/legal/requisites', async (req, reply) => {
    const value = typeof req.body?.requisites === 'string' ? req.body.requisites.trim() : null
    if (value === null) return reply.code(400).send({ error: 'нечего обновлять' })
    if (value.length > LIMITS.requisites) {
      return reply.code(400).send({ error: `Реквизиты: больше ${LIMITS.requisites} символов` })
    }
    await setSetting(LEGAL_REQUISITES_KEY, value)
    return { ok: true, requisites: value }
  })

  // PUT /api/admin/legal/reorder { ids: [id, ...] } — порядок в подвале аппки.
  app.put('/admin/legal/reorder', async (req, reply) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null
    if (!ids || ids.some((n) => !Number.isInteger(n))) {
      return reply.code(400).send({ error: 'Ожидается массив id' })
    }
    await db.$transaction(
      ids.map((id, i) => db.legalDoc.update({ where: { id }, data: { order: i } })),
    )
    return { ok: true }
  })

  // GET /api/admin/legal/:id → один документ вместе с текстом.
  app.get('/admin/legal/:id', async (req, reply) => {
    const doc = await db.legalDoc.findUnique({ where: { id: Number(req.params.id) } })
    if (!doc) return reply.code(404).send({ error: 'Документ не найден' })
    return { doc: legalAdminForm(doc) }
  })

  // POST /api/admin/legal — создать документ.
  app.post('/admin/legal', async (req, reply) => {
    const body = req.body || {}
    const slugErr = validateSlug(body.slug)
    if (slugErr) return reply.code(400).send({ error: slugErr })
    const err = validate(body, { requireTitle: true })
    if (err) return reply.code(400).send({ error: err })

    const slug = body.slug.trim()
    if (await db.legalDoc.findUnique({ where: { slug } })) {
      return reply.code(409).send({ error: 'Документ с таким адресом уже есть' })
    }

    // Новый документ встаёт в конец списка.
    const last = await db.legalDoc.findFirst({ orderBy: { order: 'desc' } })
    const doc = await db.legalDoc.create({
      data: {
        slug,
        order: (last?.order ?? -1) + 1,
        ...buildData(body, { patch: false }),
      },
    })
    return { doc: legalAdminForm(doc) }
  })

  // PUT /api/admin/legal/:id — обновить. slug меняется тоже, но это ломает
  // внешние ссылки, поэтому CMS предупреждает об этом отдельно.
  app.put('/admin/legal/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const body = req.body || {}
    const existing = await db.legalDoc.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'Документ не найден' })

    const err = validate(body, { requireTitle: false })
    if (err) return reply.code(400).send({ error: err })

    const data = buildData(body, { patch: true })

    if (typeof body.slug === 'string' && body.slug.trim() !== existing.slug) {
      const slugErr = validateSlug(body.slug)
      if (slugErr) return reply.code(400).send({ error: slugErr })
      const slug = body.slug.trim()
      const clash = await db.legalDoc.findUnique({ where: { slug } })
      if (clash && clash.id !== id) {
        return reply.code(409).send({ error: 'Документ с таким адресом уже есть' })
      }
      data.slug = slug
    }

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: 'нечего обновлять' })
    }

    const doc = await db.legalDoc.update({ where: { id }, data })
    return { doc: legalAdminForm(doc) }
  })

  // DELETE /api/admin/legal/:id — только admin.
  app.delete('/admin/legal/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id)
    const doc = await db.legalDoc.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Документ не найден' })
    await db.legalDoc.delete({ where: { id } })
    // Файл чистим только если он наш (загружен через CMS). PDF из статики
    // фронта (/docs/*.pdf) нам не принадлежит — на него ссылается ещё и
    // страница /donate/.
    if (doc.filePath) await deleteAudioFile(doc.filePath)
    return { ok: true }
  })

  // POST /api/admin/legal/:id/file — загрузить PDF (multipart, поле "file").
  app.post('/admin/legal/:id/file', async (req, reply) => {
    const id = Number(req.params.id)
    const doc = await db.legalDoc.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Документ не найден' })

    const part = await req.file()
    if (!part) return reply.code(400).send({ error: 'Файл не передан' })
    if (!isAllowedPdf(part.mimetype)) {
      return reply.code(415).send({ error: 'Только PDF' })
    }

    let saved
    try {
      saved = await savePdfStream(part.file)
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'Не удалось сохранить файл' })
    }

    // @fastify/multipart режет поток на limits.fileSize и ставит truncated —
    // обрезанный PDF не сохраняем.
    if (part.file.truncated) {
      await deleteAudioFile(saved.filename)
      const mb = Math.round(config.maxAudioBytes / 1024 / 1024)
      return reply.code(413).send({ error: `Файл больше ${mb} МБ` })
    }
    if (saved.sizeBytes > config.maxPdfBytes) {
      await deleteAudioFile(saved.filename)
      const mb = Math.round(config.maxPdfBytes / 1024 / 1024)
      return reply.code(413).send({ error: `Файл больше ${mb} МБ` })
    }

    const prevPath = doc.filePath
    const updated = await db.legalDoc.update({
      where: { id },
      data: {
        filePath: saved.filename,
        fileUrl: `${config.mediaUrlBase}/${saved.filename}`,
      },
    })
    // Старый файл удаляем ПОСЛЕ успешной записи в БД, иначе при сбое апдейта
    // документ остался бы со ссылкой на уже удалённый файл.
    if (prevPath) await deleteAudioFile(prevPath)

    return { doc: legalAdminForm(updated) }
  })

  // DELETE /api/admin/legal/:id/file — отвязать PDF (и удалить, если наш).
  app.delete('/admin/legal/:id/file', async (req, reply) => {
    const id = Number(req.params.id)
    const doc = await db.legalDoc.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Документ не найден' })
    if (!doc.fileUrl) return reply.code(400).send({ error: 'Файла нет' })

    const updated = await db.legalDoc.update({
      where: { id },
      data: { fileUrl: null, filePath: null },
    })
    if (doc.filePath) await deleteAudioFile(doc.filePath)
    return { doc: legalAdminForm(updated) }
  })
}
