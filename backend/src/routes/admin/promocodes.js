import { db } from '../../db.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'

/**
 * CRUD-роуты для управления промокодами в CMS.
 * Только role=admin.
 */
export async function adminPromocodesRoutes(app) {
  app.addHook('preHandler', adminAuthenticate)
  app.addHook('preHandler', requireAdmin)

  // GET /api/admin/promocodes
  app.get('/admin/promocodes', async () => {
    const codes = await db.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return { codes }
  })

  // POST /api/admin/promocodes { code, percent, validUntil?, maxUses?, note? }
  app.post('/admin/promocodes', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'percent'],
        properties: {
          code: { type: 'string', minLength: 3, maxLength: 60 },
          percent: { type: 'integer', minimum: 1, maximum: 100 },
          validUntil: { type: 'string' },
          maxUses: { type: 'integer', minimum: 0, maximum: 100000 },
          note: { type: 'string', maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const upper = req.body.code.trim().toUpperCase()
    if (!/^[A-Z0-9-]+$/.test(upper)) {
      return reply.code(400).send({ error: 'Только латиница, цифры и дефис' })
    }
    try {
      const code = await db.promoCode.create({
        data: {
          code: upper,
          percent: req.body.percent,
          validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
          maxUses: req.body.maxUses ?? 0,
          note: req.body.note || null,
          active: true,
        },
      })
      return { ok: true, code }
    } catch (e) {
      if (e.code === 'P2002') return reply.code(409).send({ error: 'Такой код уже есть' })
      throw e
    }
  })

  // POST /api/admin/promocodes/:id/toggle — включить/выключить
  app.post('/admin/promocodes/:id/toggle', async (req, reply) => {
    const id = Number(req.params.id)
    const current = await db.promoCode.findUnique({ where: { id } })
    if (!current) return reply.code(404).send({ error: 'not found' })
    const updated = await db.promoCode.update({
      where: { id },
      data: { active: !current.active },
    })
    return { ok: true, code: updated }
  })

  // DELETE /api/admin/promocodes/:id
  app.delete('/admin/promocodes/:id', async (req, reply) => {
    const id = Number(req.params.id)
    try {
      await db.promoCode.delete({ where: { id } })
      return { ok: true }
    } catch (e) {
      return reply.code(404).send({ error: 'not found' })
    }
  })
}
