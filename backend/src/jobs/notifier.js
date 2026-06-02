// Notifier — крон-воркер для пуш-уведомлений через Telegram.
//
// Алгоритм (каждую минуту):
//   1. Берём всех юзеров где tgUserId != null и NotifyPrefs.enabled = true
//   2. Для каждого: вычисляем «сейчас» в его таймзоне
//   3. Если минута=00 и час ∈ {8, 12, 16, 20} — кандидат
//   4. Проверяем lastSlotKey (`YYYY-MM-DD-HH:MM` в локальной TZ) — если совпал,
//      этот слот уже отстреливали сегодня, пропускаем
//   5. Определяем audience: 'paid' если active subscription, иначе 'free'
//   6. Берём случайную active фразу для (slot, audience)
//   7. Шлём sendMessage через relay (CF Worker, см. tgBot.js)
//   8. Обновляем lastSlotKey
//
// Безопасность от спама/двойников:
//   - lastSlotKey по локальной TZ юзера: если пуш отправили в 08:00 МСК,
//     то даже если cron запустится снова в 08:00 МСК — slotKey совпадёт
//     и шлём не будем
//   - Ошибка sendMessage (например, юзер заблокировал бота) логируется,
//     не пишем lastSlotKey, попробуем в следующий тик (но из-за минута=00
//     условия это будет следующий слот, не дубль)
//
// Производительность: для каждого юзера 1 SELECT (по prefs+sub в include),
// 1 SELECT по фразам (с кэшем-однажды если оптимизируем), 1 HTTP-call, 1 UPDATE.
// При ~10к активных юзеров с пушами это ~10к запросов в минуту в моменты слотов.
// На MVP-нагрузке норм; если упрёмся — добавим батчинг и индекс по «next push at».

import cron from 'node-cron'
import { db } from '../db.js'
import { sendMessage } from '../utils/tgBot.js'

const SLOT_HOURS = [8, 12, 16, 20]
const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

function pad2(n) {
  return String(n).padStart(2, '0')
}

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

async function tick(app) {
  const now = new Date()

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
    if (!SLOT_HOURS.includes(parts.hour)) continue

    const slot = `${pad2(parts.hour)}:00`
    const slotKey = `${parts.dateStr}-${slot}`
    if (u.notifyPrefs.lastSlotKey === slotKey) continue

    const isPaid =
      u.subscription?.active === true &&
      (!u.subscription.expiresAt || u.subscription.expiresAt > now)
    const audience = isPaid ? 'paid' : 'free'

    const phrases = await db.pushPhrase.findMany({
      where: { slot, audience, active: true },
    })
    if (phrases.length === 0) {
      app.log.warn({ slot, audience }, 'no push phrases configured')
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
        { userId: u.id, tg: u.tgUserId?.toString(), slot, audience },
        'push sent'
      )
    } catch (e) {
      app.log.warn(
        { err: e.message, userId: u.id, tg: u.tgUserId?.toString(), slot },
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
  app.log.info('notifier started (every minute, slots 08/12/16/20)')
  return task
}

// Тестовый прогон вручную: импортируется со скриптов
export { tick as runOnce }
