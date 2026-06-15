import cron from 'node-cron'
import { db } from '../db.js'
import { sendMail } from '../utils/mailer.js'
import { subscriptionExpiring } from '../utils/emailTemplates.js'

const NOTIFY_DAYS_BEFORE = 3
const DAY_MS = 86400000
// За что не должны слать повторно: если уже слали в последние 4 дня
// (на случай, если подписка продлилась на день и попала в окно снова —
// не хотим спамить).
const REPEAT_COOLDOWN_MS = 4 * DAY_MS

/**
 * Ежедневная задача: найти юзеров, у которых подписка кончается через
 * NOTIFY_DAYS_BEFORE дней, и они ещё не получали такое письмо в последние
 * REPEAT_COOLDOWN_MS. Шлёт письмо, помечает Subscription.expirationNotifiedAt.
 *
 * Идёт каждое утро в 10:00 по МСК (Europe/Moscow). Если бэк рестартует
 * после 10:00, разовый прогон догоняет за тот день.
 */
export function startExpirationNotifier(app) {
  // Главный cron — 10:00 каждый день
  cron.schedule('0 10 * * *', () => runOnce(app), {
    timezone: 'Europe/Moscow',
  })

  // Догоняющий прогон при старте — если бэк рестартует в 12:00, а в 10:00
  // не был запущен, оповещение всё равно уйдёт в тот же день.
  setTimeout(() => runOnce(app).catch((e) => app.log.warn({ err: e?.message }, 'expiry catchup failed')), 60_000)

  app.log.info('expiration notifier started (daily 10:00 MSK)')
}

/**
 * Одноразовый запуск — выгребает кандидатов и шлёт. Используется
 * cron'ом + ручным /internal/expiry/run endpoint'ом для тестов.
 */
export async function runOnce(app) {
  const now = Date.now()
  // Окно: подписка кончается через 3 дня ± 12 часов — это покрывает любые
  // смещения временной зоны / точного времени продления.
  const windowStart = new Date(now + NOTIFY_DAYS_BEFORE * DAY_MS - DAY_MS / 2)
  const windowEnd = new Date(now + NOTIFY_DAYS_BEFORE * DAY_MS + DAY_MS / 2)
  const cooldownThreshold = new Date(now - REPEAT_COOLDOWN_MS)

  const candidates = await db.subscription.findMany({
    where: {
      active: true,
      expiresAt: { gte: windowStart, lte: windowEnd },
      OR: [
        { expirationNotifiedAt: null },
        { expirationNotifiedAt: { lt: cooldownThreshold } },
      ],
      user: { email: { not: null } },
    },
    include: { user: true },
  })

  app.log.info({ count: candidates.length }, 'expiry-notifier: candidates')
  let sent = 0
  let failed = 0
  for (const sub of candidates) {
    try {
      const daysLeft = Math.max(1, Math.ceil((sub.expiresAt.getTime() - now) / DAY_MS))
      const tmpl = subscriptionExpiring({
        name: sub.user.name,
        expiresAt: sub.expiresAt,
        daysLeft,
      })
      await sendMail({ to: sub.user.email, ...tmpl })
      await db.subscription.update({
        where: { id: sub.id },
        data: { expirationNotifiedAt: new Date() },
      })
      sent++
    } catch (e) {
      failed++
      app.log.warn({ err: e?.message, userId: sub.userId }, 'expiry-notifier: send failed')
    }
  }
  app.log.info({ sent, failed }, 'expiry-notifier: done')
  return { sent, failed, candidates: candidates.length }
}
