import { db } from '../db.js'
import { hashPassword, verifyPassword, toPublicUser } from '../utils/auth.js'

// RFC 5322 (simplified) — good enough for "is this an email at all".
// Backend validation is a sanity check; deep validation belongs in client UX.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Min 8 chars, at least one letter AND one non-letter (digit or symbol).
const PASSWORD_RE = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*[\d\W_]).{8,}$/

// Tighter limit on auth — same IP can hit register/login/reset only 5×/min.
// Defense against credential stuffing and account enumeration.
const authLimit = {
  config: {
    rateLimit: { max: 5, timeWindow: '1 minute' },
  },
}

export async function authRoutes(app) {
  // POST /api/auth/register {identifier, password}
  app.post('/auth/register', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', minLength: 3, maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const { identifier, password } = req.body
    if (!identifier.includes('@')) {
      return reply.code(400).send({ error: 'Регистрация по телефону пока недоступна' })
    }
    if (!EMAIL_RE.test(identifier)) {
      return reply.code(400).send({ error: 'Некорректный email' })
    }
    if (!PASSWORD_RE.test(password)) {
      return reply.code(400).send({
        error: 'Пароль должен содержать минимум 8 символов, включая букву и цифру/символ',
      })
    }
    const email = identifier.toLowerCase()
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return reply.code(409).send({ error: 'Email уже зарегистрирован' })

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: email.split('@')[0],
        subscription: { create: {} },
      },
    })
    const token = app.jwt.sign({ id: user.id }, { expiresIn: '7d' })
    return {
      ok: true,
      challengeId: `email_${user.id}`,
      token,
      user: toPublicUser(user),
    }
  })

  // POST /api/auth/login {identifier, password}
  app.post('/auth/login', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', maxLength: 254 },
          password: { type: 'string', maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const { identifier, password } = req.body
    const email = identifier.toLowerCase()
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      // Same hash time whether the user exists or not — protects against
      // timing-based account enumeration.
      await verifyPassword(password, '$2b$12$0000000000000000000000.invalidsalt0000000000000000')
      return reply.code(401).send({ error: 'Кажется, пароль не подходит. Попробуй вспомнить его.' })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'Кажется, пароль не подходит. Попробуй вспомнить его.' })

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '7d' })
    return { token, user: toPublicUser(user) }
  })

  // POST /api/auth/verify {code} — placeholder for SMS flow (no provider yet).
  app.post('/auth/verify', authLimit, async (req, reply) => {
    return reply.code(501).send({ error: 'SMS-флоу пока не реализован' })
  })

  // POST /api/auth/reset {identifier} — silent OK regardless of email existence
  // (anti-enumeration). When email provider lands, dispatch the recovery here.
  app.post('/auth/reset', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identifier'],
        properties: { identifier: { type: 'string', maxLength: 254 } },
      },
    },
  }, async (req, reply) => {
    return { ok: true }
  })

  // GET /api/auth/me — current user (requires JWT)
  app.get('/auth/me', { preHandler: app.authenticate }, async (req) => {
    return { user: toPublicUser(req.user) }
  })

  // DELETE /api/auth/me — wipes the user and all linked data. All Prisma
  // relations are `onDelete: Cascade`, so a single User.delete cleans up
  // Subscription, Checkin, KtEntry, TrackerDay, PracticeCompletion,
  // UnlockedAwareness, BonusUnlock in one tx.
  // GDPR + Apple/Google app-store requirement.
  app.delete('/auth/me', { preHandler: app.authenticate }, async (req) => {
    await db.user.delete({ where: { id: req.user.id } })
    return { ok: true }
  })
}
