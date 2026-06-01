import { db } from '../db.js'
import { sendMail } from '../utils/mailer.js'

const VALID_TYPES = ['review', 'question', 'bug', 'other']
const FEEDBACK_TO = process.env.FEEDBACK_EMAIL || process.env.SMTP_USER || 'noreply@all-relaxme.ru'

// POST /api/feedback {type, message, email?, name?}
// Авторизация опциональна: залогиненный юзер автоматически прикрепляется
// к фидбеку (userId + email/name из profile). Анонимные тоже могут
// отправить — но обязаны передать email/name в body.
//
// Backend записывает в БД и пытается отправить email через sendMail
// (при настроенном SMTP — реально, иначе в outbox-файл). Endpoint
// возвращает 200 даже если SMTP молча упал — главное чтобы запись
// в БД была сохранена.

export async function feedbackRoutes(app) {
  // Опциональная аутентификация: если есть валидный JWT — подцепим юзера.
  app.post(
    '/feedback',
    {
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            type: { type: 'string', enum: VALID_TYPES },
            message: { type: 'string', minLength: 1, maxLength: 5000 },
            email: { type: 'string', maxLength: 254 },
            name: { type: 'string', maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      const { message } = req.body
      const type = req.body.type && VALID_TYPES.includes(req.body.type) ? req.body.type : 'other'

      // Попытка достать юзера из JWT, но не требуем (анонимный фидбек OK)
      let userId = null
      let userEmail = req.body.email || null
      let userName = req.body.name || null
      try {
        await req.jwtVerify()
        if (req.user?.id) {
          userId = req.user.id
          const u = await db.user.findUnique({ where: { id: userId } })
          if (u) {
            userEmail = userEmail || u.email
            userName = userName || u.name
          }
        }
      } catch {
        // Не залогинен — норм, продолжаем
      }

      // Анонимный фидбек требует хотя бы email для обратной связи
      if (!userId && !userEmail) {
        return reply.code(400).send({ error: 'Укажи email чтобы мы могли ответить' })
      }

      const row = await db.feedback.create({
        data: { userId, type, message, email: userEmail, name: userName },
      })

      // Отправка письма — не блокируем ответ юзеру если SMTP не работает
      const fromBlock = userName
        ? `${userName}${userEmail ? ` &lt;${userEmail}&gt;` : ''}`
        : (userEmail || 'аноним')
      sendMail({
        to: FEEDBACK_TO,
        subject: `Meditation · фидбек (${type}) от ${userName || userEmail || 'аноним'}`,
        text:
          `Тип: ${type}\n` +
          `От: ${fromBlock}\n` +
          (userId ? `User ID: ${userId}\n` : '') +
          `Время: ${new Date().toISOString()}\n\n` +
          `Сообщение:\n${message}`,
        html:
          `<p><b>Тип:</b> ${type}</p>` +
          `<p><b>От:</b> ${fromBlock}</p>` +
          (userId ? `<p><b>User ID:</b> ${userId}</p>` : '') +
          `<p><b>Время:</b> ${new Date().toISOString()}</p>` +
          `<hr><div style="white-space:pre-wrap">${message.replace(/</g, '&lt;')}</div>`,
      }).catch((e) => app.log.warn({ err: e?.message }, 'feedback mail send failed'))

      return { ok: true, id: row.id }
    }
  )
}
