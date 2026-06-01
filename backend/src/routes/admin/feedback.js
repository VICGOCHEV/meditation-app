import { db } from '../../db.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'

// Admin API для фидбека: список + изменение статуса (new → read → replied).
// UI в /manage/ читает GET /api/admin/feedback, помечает read PATCH-ом.

export async function adminFeedbackRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)

  // GET /api/admin/feedback?status=new
  app.get('/admin/feedback', async (req) => {
    const where = {}
    if (typeof req.query?.status === 'string' && req.query.status) {
      where.status = req.query.status
    }
    const rows = await db.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      email: r.email || r.user?.email || null,
      name: r.name || r.user?.name || null,
      userId: r.userId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))
  })

  // PATCH /api/admin/feedback/:id {status}
  app.patch('/admin/feedback/:id', async (req, reply) => {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'bad id' })
    const status = String(req.body?.status || '')
    if (!['new', 'read', 'replied'].includes(status)) {
      return reply.code(400).send({ error: 'bad status' })
    }
    const row = await db.feedback.update({ where: { id }, data: { status } })
    return { ok: true, id: row.id, status: row.status }
  })
}
