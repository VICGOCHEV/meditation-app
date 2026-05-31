import { db } from '../../db.js'
import { config } from '../../config.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'
import {
  saveAudioStream,
  deleteAudioFile,
  isAllowedAudio,
  toPublicMedia,
} from '../../utils/media.js'

export async function adminMediaRoutes(app) {
  // POST /api/admin/media — загрузка одного аудиофайла (multipart, поле "file").
  // Возвращает MediaFile в публичной форме (id + url + durationSec).
  app.post('/admin/media', { preHandler: adminAuthenticate }, async (req, reply) => {
    const part = await req.file()
    if (!part) return reply.code(400).send({ error: 'Файл не передан' })
    if (!isAllowedAudio(part.mimetype)) {
      return reply.code(415).send({ error: 'Только mp3 (audio/mpeg)' })
    }

    let saved
    try {
      saved = await saveAudioStream(part.file)
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'Не удалось сохранить файл' })
    }

    // @fastify/multipart обрезает поток на limits.fileSize и ставит truncated.
    // Битый (обрезанный) файл не сохраняем — удаляем и отдаём 413.
    if (part.file.truncated) {
      await deleteAudioFile(saved.filename)
      const mb = Math.round(config.maxAudioBytes / 1024 / 1024)
      return reply.code(413).send({ error: `Файл больше ${mb} МБ` })
    }

    const media = await db.mediaFile.create({
      data: {
        path: saved.filename,
        url: `${config.mediaUrlBase}/${saved.filename}`,
        originalName: part.filename || null,
        mime: 'audio/mpeg',
        sizeBytes: saved.sizeBytes,
        durationSec: saved.durationSec,
      },
    })
    return { media: toPublicMedia(media) }
  })

  // GET /api/admin/media — библиотека (новейшие сверху, пагинация).
  app.get('/admin/media', { preHandler: adminAuthenticate }, async (req) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50))
    const [rows, total] = await Promise.all([
      db.mediaFile.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.mediaFile.count(),
    ])
    return { items: rows.map(toPublicMedia), total, page, pageSize }
  })

  // DELETE /api/admin/media/:id — удаляет запись и файл с диска.
  // FK у практик/голосов — onDelete: SetNull (у Voice/Music — required, поэтому
  // там удаление media с активной связкой упадёт; на фронте даём удалять только
  // несвязанные либо переназначаем).
  app.delete('/admin/media/:id', { preHandler: adminAuthenticate }, async (req, reply) => {
    const id = Number(req.params.id)
    const media = await db.mediaFile.findUnique({ where: { id } })
    if (!media) return reply.code(404).send({ error: 'Файл не найден' })
    try {
      await db.mediaFile.delete({ where: { id } })
    } catch {
      return reply.code(409).send({ error: 'Файл используется голосом или музыкой' })
    }
    await deleteAudioFile(media.path)
    return { ok: true }
  })
}
