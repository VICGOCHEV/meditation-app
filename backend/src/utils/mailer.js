import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.js'

// Абстракция отправки писем. Две стратегии:
//   1. Если в .env есть SMTP_HOST + SMTP_USER + SMTP_PASS — отправляем
//      через nodemailer.
//   2. Иначе — пишем письмо в JSON-файл в outbox-папке (для дев/стейджа
//      без SMTP). Бэк продолжает работать как если бы отправили.
//
// Подключение к /api/auth/reset — silent send: даже если бэк не смог
// отправить, эндпоинт всё равно возвращает 200 (защита от account
// enumeration через сравнение времён ответа).

const HAS_SMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

let _transporter = null
async function transporter() {
  if (_transporter) return _transporter
  if (!HAS_SMTP) return null
  // Динамический import чтобы не падать при отсутствии модуля
  // в среде без nodemailer (когда строим без mail).
  const nm = await import('nodemailer')
  const port = Number(process.env.SMTP_PORT) || 465
  // secure=true (полный TLS) для портов которые реально SSL:
  //   465 (Yandex/Gmail классика), 1127 (Selectel Mail TLS).
  // Для 587 / 1126 — STARTTLS (secure=false, апгрейд после EHLO).
  // Override явно через SMTP_SECURE=true|false если нужно.
  const secure =
    process.env.SMTP_SECURE != null
      ? process.env.SMTP_SECURE === 'true'
      : port === 465 || port === 1127
  _transporter = nm.default.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return _transporter
}

async function fileOutbox({ from, to, subject, text, html }) {
  // Папка outbox под uploadDir — чтобы не плодить лишних путей.
  const dir = path.join(config.uploadDir, '_outbox')
  await fs.mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = path.join(dir, `${stamp}-${to.replace(/[^a-z0-9._-]/gi, '_')}.json`)
  await fs.writeFile(
    file,
    JSON.stringify({ from, to, subject, text, html, at: new Date().toISOString() }, null, 2),
    'utf8'
  )
  return { ok: true, mode: 'file', file }
}

/**
 * Отправка письма. Никогда не бросает наружу — пишет в журнал и идёт
 * дальше (для transactional-флоу типа recovery: лучше тихо проглотить
 * чем сломать аккаунт-флоу).
 *
 * @returns {Promise<{ok:boolean, mode:'smtp'|'file'|'skip', info?:any}>}
 */
export async function sendMail({ to, subject, text, html, from }) {
  const fromAddr =
    from ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'noreply@all-relaxme.ru'

  try {
    const t = await transporter()
    if (!t) {
      // Нет SMTP — пишем в файл, чтобы можно было дебажить
      return await fileOutbox({ from: fromAddr, to, subject, text, html })
    }
    const info = await t.sendMail({ from: fromAddr, to, subject, text, html })
    return { ok: true, mode: 'smtp', info }
  } catch (e) {
    // Не падаем — пишем в outbox для разбора + логируем
    // eslint-disable-next-line no-console
    console.error('mailer error:', e.message)
    try {
      return await fileOutbox({ from: fromAddr, to, subject, text, html })
    } catch (e2) {
      return { ok: false, mode: 'skip', info: e2.message }
    }
  }
}

export const mailerConfigured = HAS_SMTP
