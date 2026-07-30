// Notifier — крон-воркер для пуш-уведомлений «начало практики» через Telegram.
//
// Аудитория = ПОДПИСЧИКИ БОТА (TgSubscriber), а не привязанные к аккаунту.
// «Слать всем, кто в боте» — любой, кто жал Start и не сделал /stop. Если
// подписчик привязан к аккаунту (userId), настройки берём из него (тумблер
// «Напоминания» зеркалится в enabled, таймзона, audience по подписке);
// bot-only подписчик (userId=null) → дефолт МСК / free.
//
// Алгоритм (каждую минуту):
//   1. Берём всех TgSubscriber где enabled = true (+ linked user/subscription)
//   2. Для каждого: вычисляем «сейчас» в его таймзоне
//   3. Если минута=00 и час совпал с одной из фаз (утро/день/вечер) — кандидат
//   4. Проверяем lastSlotKey (`YYYY-MM-DD-<phase>`) — если совпал, эту фазу уже
//      отстреливали сегодня, пропускаем
//   5. Определяем audience: 'paid' если у привязанного юзера active subscription,
//      иначе 'free'
//   6. Берём случайную active фразу, у которой в phases есть эта фаза, (audience)
//   7. Шлём sendMessage через relay (CF Worker, см. tgBot.js)
//   8. Обновляем lastSlotKey; если юзер заблокировал бота — гасим подписчика
//
// Безопасность от спама/двойников:
//   - lastSlotKey по локальной TZ подписчика: фаза стреляет раз в день
//   - Мёртвый чат (bot blocked / deactivated) → enabled=false, больше не долбим
//   - Прочие ошибки sendMessage логируем, lastSlotKey не пишем

import cron from 'node-cron'
import { db } from '../db.js'
import { sendMessage, isDeadChatError } from '../utils/tgBot.js'
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

  // Все подписчики бота с включённой доставкой + привязанный аккаунт (если есть)
  // для audience/таймзоны. «Слать всем, кто в боте».
  const subs = await db.tgSubscriber.findMany({
    where: { enabled: true },
    include: { user: { include: { subscription: true } } },
  })

  // Кэш фраз по (phase|audience) в пределах одного тика — чтобы не бить БД
  // одним запросом на каждого подписчика.
  const phraseCache = new Map()
  async function phrasesFor(phaseKey, audience) {
    const key = `${phaseKey}|${audience}`
    if (phraseCache.has(key)) return phraseCache.get(key)
    const inPhase = (rows) => rows.filter((p) => parsePhases(p.phases).includes(phaseKey))
    let list = inPhase(
      await db.pushPhrase.findMany({ where: { audience, active: true } })
    )
    // С 2026-07-30 подписок нет — все подписчики считаются 'free'. Фразы,
    // заведённые клиентом для аудитории 'paid', иначе просто перестали бы
    // отправляться, и в фазе без 'free'-фраз пуш бы не ушёл вовсе.
    // Поэтому при пустой выборке берём любые активные фразы этой фазы.
    if (list.length === 0) {
      list = inPhase(await db.pushPhrase.findMany({ where: { active: true } }))
    }
    phraseCache.set(key, list)
    return list
  }

  for (const s of subs) {
    const tz = s.timezone || 'Europe/Moscow'

    let parts
    try {
      parts = localParts(now, tz)
    } catch {
      // Битая таймзона — игнорим этого подписчика
      continue
    }

    if (parts.minute !== 0) continue
    const phase = PHASES.find((p) => p.hour === parts.hour)
    if (!phase) continue

    const slotKey = `${parts.dateStr}-${phase.key}`
    if (s.lastSlotKey === slotKey) continue

    const sub = s.user?.subscription
    const isPaid =
      sub?.active === true && (!sub.expiresAt || sub.expiresAt > now)
    const audience = isPaid ? 'paid' : 'free'

    const phrases = await phrasesFor(phase.key, audience)
    if (phrases.length === 0) {
      app.log.warn({ phase: phase.key, audience }, 'no push phrases configured')
      continue
    }

    const phrase = pickRandom(phrases)

    try {
      await sendMessage(Number(s.chatId), phrase.text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть приложение', web_app: { url: MINI_APP_URL } }],
          ],
        },
      })
      await db.tgSubscriber.update({
        where: { id: s.id },
        data: { lastSlotKey: slotKey },
      })
      app.log.info(
        { subId: s.id, chat: s.chatId?.toString(), userId: s.userId, phase: phase.key, audience },
        'push sent'
      )
    } catch (e) {
      if (isDeadChatError(e)) {
        // Юзер заблокировал бота / удалил аккаунт — гасим, чтобы не долбить.
        await db.tgSubscriber.update({ where: { id: s.id }, data: { enabled: false } })
        app.log.info(
          { subId: s.id, chat: s.chatId?.toString() },
          'subscriber disabled (dead chat)'
        )
      } else {
        app.log.warn(
          { err: e.message, subId: s.id, chat: s.chatId?.toString(), phase: phase.key },
          'push failed'
        )
      }
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
