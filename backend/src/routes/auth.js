import { db } from '../db.js'
import { hashPassword, verifyPassword, toPublicUser } from '../utils/auth.js'

export async function authRoutes(app) {
  // POST /api/auth/register {identifier, password}
  app.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (req, reply) => {
    const { identifier, password } = req.body
    if (!identifier.includes('@')) {
      // Phone-based register not supported until SMS provider arrives.
      return reply.code(400).send({ error: 'Регистрация по телефону пока недоступна' })
    }
    const existing = await db.user.findUnique({ where: { email: identifier } })
    if (existing) return reply.code(409).send({ error: 'Email уже зарегистрирован' })

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: identifier,
        passwordHash,
        name: identifier.split('@')[0],
        subscription: { create: {} },
      },
    })
    return { ok: true, challengeId: `verified_${user.id}`, user: toPublicUser(user) }
  })

  // POST /api/auth/login {identifier, password}
  app.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { identifier, password } = req.body
    const user = await db.user.findUnique({ where: { email: identifier } })
    if (!user) return reply.code(401).send({ error: 'Неверный email или пароль' })
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'Неверный email или пароль' })

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '7d' })
    return { token, user: toPublicUser(user) }
  })

  // POST /api/auth/verify {code} — mock for SMS flow (until provider lands)
  app.post('/auth/verify', async (req, reply) => {
    return reply.code(501).send({ error: 'SMS-флоу пока не реализован' })
  })

  // POST /api/auth/reset {identifier} — mock; pretends to send recovery email
  app.post('/auth/reset', {
    schema: {
      body: {
        type: 'object',
        required: ['identifier'],
        properties: { identifier: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    // No-op: silently say ok regardless of whether email exists (anti-enumeration).
    return { ok: true }
  })

  // GET /api/auth/me — current user (requires JWT)
  app.get('/auth/me', { preHandler: app.authenticate }, async (req) => {
    return { user: toPublicUser(req.user) }
  })
}
