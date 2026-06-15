import { db } from '../../db.js'
import { config } from '../../config.js'
import { verifyPassword } from '../../utils/auth.js'
import { adminAuthenticate } from '../../middlewares/adminAuth.js'

// Тот же anti-stuffing лимит, что и на юзерском логине: 5 попыток / мин / IP.
const authLimit = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }

const toPublicAdmin = (a) => ({ id: a.id, email: a.email, name: a.name, role: a.role })

export async function adminAuthRoutes(app) {
  // POST /api/admin/login {email, password}
  app.post('/admin/login', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', maxLength: 254 },
          password: { type: 'string', maxLength: 200 },
          remember: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const email = String(req.body.email).toLowerCase().trim()
    const admin = await db.adminUser.findUnique({ where: { email } })
    if (!admin) {
      // постоянное время ответа — защита от перебора существующих логинов
      await verifyPassword(req.body.password, '$2b$12$0000000000000000000000.invalidsalt0000000000000000')
      return reply.code(401).send({ error: 'Неверный email или пароль' })
    }
    const ok = await verifyPassword(req.body.password, admin.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'Неверный email или пароль' })

    // remember=true → длинный TTL (по умолчанию 30 дней) чтобы клиент не
    // вводил пароль каждый день. Без галки — 12h как раньше.
    const ttl = req.body.remember ? config.adminJwtTtlRemember : config.adminJwtTtl
    const token = app.jwt.sign(
      { kind: 'admin', aid: admin.id, role: admin.role },
      { expiresIn: ttl },
    )
    return { token, admin: toPublicAdmin(admin) }
  })

  // GET /api/admin/me — текущий админ
  app.get('/admin/me', { preHandler: adminAuthenticate }, async (req) => {
    return { admin: toPublicAdmin(req.admin) }
  })
}
