import { db } from '../../db.js'
import { hashPassword, verifyPassword } from '../../utils/auth.js'
import { adminAuthenticate, requireAdmin } from '../../middlewares/adminAuth.js'

const toPublicAdmin = (a) => ({ id: a.id, email: a.email, name: a.name, role: a.role, createdAt: a.createdAt })

// Самообслуживание аккаунта CMS: смена своего пароля + (для role: admin)
// управление списком админов. Раньше всё это делалось руками через
// prisma/seed-admin.js на сервере — теперь есть UI.
export async function adminAccountRoutes(app) {
  // все роуты требуют залогиненного админа
  app.addHook('preHandler', adminAuthenticate)

  // PATCH /api/admin/password { currentPassword, newPassword } — смена СВОЕГО пароля.
  // Доступно любому залогиненному админу (и editor, и admin).
  app.patch('/admin/password', {
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', maxLength: 200 },
          newPassword: { type: 'string', minLength: 8, maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const ok = await verifyPassword(req.body.currentPassword, req.admin.passwordHash)
    if (!ok) return reply.code(400).send({ error: 'Текущий пароль неверен' })
    if (req.body.newPassword === req.body.currentPassword) {
      return reply.code(400).send({ error: 'Новый пароль совпадает с текущим' })
    }
    const passwordHash = await hashPassword(req.body.newPassword)
    await db.adminUser.update({ where: { id: req.admin.id }, data: { passwordHash } })
    return { ok: true }
  })

  // ── Управление админами — только role: admin ──

  // GET /api/admin/admins — список всех админов
  app.get('/admin/admins', { preHandler: requireAdmin }, async () => {
    const admins = await db.adminUser.findMany({ orderBy: { createdAt: 'asc' } })
    return { admins: admins.map(toPublicAdmin) }
  })

  // POST /api/admin/admins { email, password, name?, role } — создать нового
  app.post('/admin/admins', {
    preHandler: requireAdmin,
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 200 },
          name: { type: 'string', maxLength: 120 },
          role: { type: 'string', enum: ['editor', 'admin'] },
        },
      },
    },
  }, async (req, reply) => {
    const email = String(req.body.email).toLowerCase().trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return reply.code(400).send({ error: 'Некорректный email' })
    }
    const exists = await db.adminUser.findUnique({ where: { email } })
    if (exists) return reply.code(409).send({ error: 'Админ с таким email уже есть' })

    const passwordHash = await hashPassword(req.body.password)
    const admin = await db.adminUser.create({
      data: {
        email,
        passwordHash,
        role: req.body.role || 'editor',
        name: req.body.name?.trim() || email.split('@')[0],
      },
    })
    return { admin: toPublicAdmin(admin) }
  })

  // DELETE /api/admin/admins/:id — удалить админа
  app.delete('/admin/admins/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id)
    if (id === req.admin.id) return reply.code(400).send({ error: 'Нельзя удалить самого себя' })

    const target = await db.adminUser.findUnique({ where: { id } })
    if (!target) return reply.code(404).send({ error: 'Админ не найден' })

    // не даём остаться без единственного полноправного admin
    if (target.role === 'admin') {
      const adminCount = await db.adminUser.count({ where: { role: 'admin' } })
      if (adminCount <= 1) return reply.code(400).send({ error: 'Это последний администратор — удалить нельзя' })
    }

    await db.adminUser.delete({ where: { id } })
    return { ok: true }
  })
}
