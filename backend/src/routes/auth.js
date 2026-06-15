import crypto from 'node:crypto'
import { db } from '../db.js'
import { hashPassword, verifyPassword, toPublicUser } from '../utils/auth.js'
import { verifyTgInitData, verifyVkSign } from '../utils/platformAuth.js'
import { sendMail } from '../utils/mailer.js'
import {
  passwordReset as passwordResetEmail,
  welcomeEmail,
} from '../utils/emailTemplates.js'

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

    // Welcome-письмо. Не блокирует ответ — если SMTP отвалится, юзер
    // всё равно получит token и зайдёт. Письмо пойдёт в outbox.
    const tmpl = welcomeEmail({ name: user.name })
    sendMail({ to: user.email, ...tmpl })
      .catch((e) => app.log.warn({ err: e?.message, userId: user.id }, 'welcome email failed'))

    return {
      ok: true,
      challengeId: `email_${user.id}`,
      token,
      user: toPublicUser(user),
    }
  })

  // POST /api/auth/login {identifier, password, remember?}
  // remember=true → токен на 90 дней (галка «Запомнить меня»),
  // иначе дефолтные 7 дней.
  app.post('/auth/login', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', maxLength: 254 },
          password: { type: 'string', maxLength: 200 },
          remember: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const { identifier, password, remember } = req.body
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

    const ttl = remember ? '90d' : '7d'
    const token = app.jwt.sign({ id: user.id }, { expiresIn: ttl })
    return { token, user: toPublicUser(user) }
  })

  // POST /api/auth/verify {code} — placeholder for SMS flow (no provider yet).
  app.post('/auth/verify', authLimit, async (req, reply) => {
    return reply.code(501).send({ error: 'SMS-флоу пока не реализован' })
  })

  // POST /api/auth/reset {identifier} — silent OK regardless of email existence
  // (anti-enumeration). Если email есть в БД и SMTP настроен — отправим
  // письмо с инструкцией. Если SMTP не настроен — пишем в outbox-файл
  // (см. mailer.js). Отказ от отправки никогда не выливается в 5xx —
  // юзер всегда получает 200 чтобы атакующий не отличил «email есть» vs «нет».
  app.post('/auth/reset', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['identifier'],
        properties: { identifier: { type: 'string', maxLength: 254 } },
      },
    },
  }, async (req) => {
    const identifier = String(req.body.identifier || '').trim().toLowerCase()
    if (identifier.includes('@')) {
      const user = await db.user.findUnique({ where: { email: identifier } })
      if (user) {
        // Random 32-byte token → юзеру в письмо как hex.
        // В БД храним только sha256(token) + срок 1 час: даже при дампе БД
        // токен не утечёт, а одноразовость гарантирована clear'ом hash'а
        // после успешного reset'а.
        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const exp = new Date(Date.now() + 60 * 60 * 1000)
        await db.user.update({
          where: { id: user.id },
          data: { resetTokenHash: tokenHash, resetTokenExp: exp },
        })
        const base = process.env.APP_PUBLIC_URL || 'https://all-relaxme.ru'
        const resetUrl = `${base}/auth/reset/confirm?token=${token}`
        const tmpl = passwordResetEmail({ name: user.name, resetUrl })
        await sendMail({ to: user.email, ...tmpl })
      }
    }
    // Всегда возвращаем 200 — anti-enumeration
    return { ok: true }
  })

  // POST /api/auth/reset/confirm {token, password}
  // Подтверждение сброса: ищем юзера по sha256(token) + срок, обновляем
  // passwordHash, чистим resetTokenHash/Exp (одноразовый токен).
  // Возвращаем JWT, чтобы юзер сразу попал в приложение.
  app.post('/auth/reset/confirm', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', minLength: 32, maxLength: 200 },
          password: { type: 'string', minLength: 8, maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const { token, password } = req.body
    if (!PASSWORD_RE.test(password)) {
      return reply.code(400).send({
        error: 'Пароль слишком слабый: нужны 8+ символов, хотя бы одна буква и одна цифра или символ',
      })
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await db.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExp: { gt: new Date() },
      },
    })
    if (!user) {
      return reply.code(400).send({ error: 'Ссылка устарела или уже использована. Запроси новую.' })
    }
    const passwordHash = await hashPassword(password)
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExp: null,
      },
    })
    const jwtToken = app.jwt.sign({ id: updated.id }, { expiresIn: '7d' })
    return { ok: true, token: jwtToken, user: toPublicUser(updated) }
  })

  // GET /api/auth/me — current user (requires JWT)
  app.get('/auth/me', { preHandler: app.authenticate }, async (req) => {
    return { user: toPublicUser(req.user) }
  })

  // POST /api/auth/tg-init {initData}
  // Mini App identity через Telegram WebApp.initData. Серверная HMAC-проверка
  // подписи через TG_BOT_TOKEN. При первом заходе — upsert User по tg_user_id.
  app.post('/auth/tg-init', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['initData'],
        properties: { initData: { type: 'string', maxLength: 4096 } },
      },
    },
  }, async (req, reply) => {
    const botToken = process.env.TG_BOT_TOKEN
    if (!botToken) {
      return reply.code(503).send({ error: 'TG bot не сконфигурирован на сервере' })
    }
    const tgUser = verifyTgInitData(req.body.initData, botToken)
    if (!tgUser?.id) {
      return reply.code(401).send({ error: 'Невалидная подпись initData' })
    }

    const tgId = BigInt(tgUser.id)
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim()
    const name = fullName || tgUser.username || 'Пользователь Telegram'

    // upsert по tg_user_id — найдём существующего или создадим
    let user = await db.user.findUnique({ where: { tgUserId: tgId } })
    if (!user) {
      user = await db.user.create({
        data: {
          tgUserId: tgId,
          name,
          subscription: { create: {} },
        },
      })
    } else if (user.name !== name) {
      // Подтянем актуальное имя/username при последующих заходах
      user = await db.user.update({ where: { id: user.id }, data: { name } })
    }

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '7d' })
    return { ok: true, token, user: toPublicUser(user) }
  })

  // POST /api/auth/vk-init {searchParams}
  // VK Mini App identity через query-параметры контейнера. HMAC-SHA256
  // подпись через VK_SECURE_KEY.
  app.post('/auth/vk-init', {
    ...authLimit,
    schema: {
      body: {
        type: 'object',
        required: ['searchParams'],
        properties: { searchParams: { type: 'string', maxLength: 4096 } },
      },
    },
  }, async (req, reply) => {
    const secureKey = process.env.VK_SECURE_KEY
    if (!secureKey) {
      return reply.code(503).send({ error: 'VK не сконфигурирован на сервере' })
    }
    const vk = verifyVkSign(req.body.searchParams, secureKey)
    if (!vk?.vk_user_id) {
      return reply.code(401).send({ error: 'Невалидная подпись VK' })
    }

    const vkId = BigInt(vk.vk_user_id)
    let user = await db.user.findUnique({ where: { vkUserId: vkId } })
    if (!user) {
      user = await db.user.create({
        data: {
          vkUserId: vkId,
          name: `VK ${vk.vk_user_id}`,
          subscription: { create: {} },
        },
      })
    }

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '7d' })
    return { ok: true, token, user: toPublicUser(user) }
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
