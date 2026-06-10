import { sendMail } from '../utils/mailer.js'

// Internal-only endpoints. Защищены секретом из ENV (`INTERNAL_ALERT_SECRET`)
// и привязаны к loopback'у — слушаем только 127.0.0.1, проверяем
// заголовок X-Internal-Secret. Через Caddy /internal/* не проксируется
// в публичный интернет — путь живёт только локально на сервере.
//
// Использование (для watchdog.sh):
//   curl -X POST http://127.0.0.1:3001/internal/alert \
//        -H 'Content-Type: application/json' \
//        -H 'X-Internal-Secret: <env>' \
//        -d '{"subject":"...", "body":"...", "to":["a@x","b@y"]}'
export async function internalRoutes(app) {
  app.post('/internal/alert', async (req, reply) => {
    const expected = process.env.INTERNAL_ALERT_SECRET
    if (!expected) {
      return reply.code(503).send({ error: 'internal secret not configured' })
    }
    if (req.headers['x-internal-secret'] !== expected) {
      return reply.code(401).send({ error: 'forbidden' })
    }
    // Только loopback — пресекаем случайный публичный доступ через Caddy:
    const ip = req.ip || req.socket?.remoteAddress
    if (ip && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      return reply.code(403).send({ error: 'loopback only' })
    }
    const { subject, body, to } = req.body || {}
    if (!subject || !body || !Array.isArray(to) || to.length === 0) {
      return reply.code(400).send({ error: 'subject/body/to required' })
    }
    const recipients = to.filter((x) => typeof x === 'string' && x.includes('@'))
    if (!recipients.length) {
      return reply.code(400).send({ error: 'no valid recipients' })
    }
    try {
      await sendMail({
        to: recipients.join(','),
        subject,
        text: body,
        html: `<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;background:#11101a;color:#f4f0ff;padding:16px;border-radius:8px;">${escapeHtml(body)}</pre>`,
      })
      return { ok: true, sent_to: recipients.length }
    } catch (e) {
      req.log?.error({ err: e?.message }, 'internal alert send failed')
      return reply.code(500).send({ error: 'send failed', detail: e?.message })
    }
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
