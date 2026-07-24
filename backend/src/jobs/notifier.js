// Notifier — крон-воркер для пуш-уведомлений «начало практики» через Telegram.
//
// Алгоритм (каждую минуту):
//   1. Берём всех юзеров где tgUserId != null и NotifyPrefs.enabled = true
//   2. Для каждого: вычисляем «сейчас» в его таймзоне
//   3. Если минута=00 и час совпал с одной из фаз (утро/день/вечер) — кандидат
//   4. Проверяем lastSlotKey (`YYYY-MM-DD-<phase>` в локальной TZ) — если совпал,
//      эту фазу уже отстреливали сегодня, пропускаем
//   5. Определяем audience: 'paid' если active subscription, иначе 'free'
//   6. Берём случайную active фразу, у которой в phases есть эта фаза, (audience)
//   7. Шлём sendMessage через relay (CF Worker, см. tgBot.js)
//   8. Обновляем lastSlotKey
//
// Безопасность от спама/двойников:
//   - lastSlotKey по локальной TZ юзера: если пуш отправили в фазу «утро»,
//     то даже если cron запустится снова в тот же час — ключ совпадёт и
//     шлём не будем
//   - Ошибка sendMessage (например, юзер заблокировал бота) логируется,
//     не пишем lastSlotKey, попробуем в следующий тик (но из-за минута=00
//     условия это будет следующая фаза, не дубль)

import cron from 'node-cron'
import { db } from '../db.js'
import { sendMessage } from '../utils/tgBot.js'
import { PHASES, parsePhases } from '../utils/pushPhases.js'

const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

// Возвращает {hour, minute, dateStr} для TZ юзера. dateStr = YYYY-MM-DD.
function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const hour = parseInt(get('hour'), 10) % 24 // на всякий случай (00 vs 24)
  return {
    hour,
    minute: parseInt(get('minute'), 10),
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function tick(app, now = new Date()) {

  // Берём всех с tgUserId и включёнными пушами + subscription для audience
  const users = await db.user.findMany({
    where: {
      tgUserId: { not: null },
      notifyPrefs: { enabled: true },
    },
    include: { notifyPrefs: true, subscription: true },
  })

  for (const u of users) {
    if (!u.notifyPrefs) continue
    const tz = u.notifyPrefs.timezone || 'Europe/Moscow'

    let parts
    try {
      parts = localParts(now, tz)
    } catch {
      // Битая таймзона — игнорим этого юзера
      continue
    }

    if (parts.minute !== 0) continue
    const phase = PHASES.find((p) => p.hour === parts.hour)
    if (!phase) continue

    const slotKey = `${parts.dateStr}-${phase.key}`
    if (u.notifyPrefs.lastSlotKey === slotKey) continue

    const isPaid =
      u.subscription?.active === true &&
      (!u.subscription.expiresAt || u.subscription.expiresAt > now)
    const audience = isPaid ? 'paid' : 'free'

    // Фразы этой аудитории, у которых в phases есть текущая фаза.
    // Фильтруем в приложении (phases — comma-join, немного строк на аудиторию).
    const candidates = await db.pushPhrase.findMany({
      where: { audience, active: true },
    })
    const phrases = candidates.filter((p) => parsePhases(p.phases).includes(phase.key))
    if (phrases.length === 0) {
      app.log.warn({ phase: phase.key, audience }, 'no push phrases configured')
      continue
    }

    const phrase = pickRandom(phrases)

    try {
      await sendMessage(Number(u.tgUserId), phrase.text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть приложение', web_app: { url: MINI_APP_URL } }],
          ],
        },
      })
      await db.notifyPrefs.update({
        where: { userId: u.id },
        data: { lastSlotKey: slotKey },
      })
      app.log.info(
        { userId: u.id, tg: u.tgUserId?.toString(), phase: phase.key, audience },
        'push sent'
      )
    } catch (e) {
      app.log.warn(
        { err: e.message, userId: u.id, tg: u.tgUserId?.toString(), phase: phase.key },
        'push failed'
      )
    }
  }
}

export function startNotifier(app) {
  if (process.env.NOTIFIER_DISABLED === '1') {
    app.log.warn('notifier disabled via NOTIFIER_DISABLED=1')
    return null
  }
  // Каждую минуту. cron в TZ сервера — не важно, мы всё равно считаем
  // локально для каждого юзера.
  const task = cron.schedule('* * * * *', async () => {
    try {
      await tick(app)
    } catch (e) {
      app.log.error({ err: e.message, stack: e.stack }, 'notifier tick crashed')
    }
  })
  app.log.info(
    { phases: PHASES.map((p) => `${p.key}@${p.hour}:00`) },
    'notifier started (every minute, day-phases)'
  )
  return task
}

// Тестовый прогон вручную: импортируется со скриптов
export { tick as runOnce }
