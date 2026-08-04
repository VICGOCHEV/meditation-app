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
//   3. Если час совпал с одной из фаз (утро/день/вечер) и минута попала в окно
//      :00–:04 — кандидат
//   4. Проверяем lastSlotKey (`YYYY-MM-DD-<phase>`) — если совпал, эту фазу уже
//      отстреливали сегодня, пропускаем
//   5. Определяем audience: 'paid' если у привязанного юзера active subscription,
//      иначе 'free'
//   6. Берём СЛЕДУЮЩУЮ ПО РОТАЦИИ active фразу этой фазы (utils/pushRotation.js)
//   7. Шлём sendMessage через relay (CF Worker, см. tgBot.js)
//   8. Одной транзакцией двигаем курсор ротации и пишем lastSlotKey; если юзер
//      заблокировал бота — гасим подписчика
//
// Почему окно :00–:04, а не ровно :00: если отправка упала (сеть, 5xx relay),
// курсор и lastSlotKey не пишутся, и раньше пуш терялся до следующего дня —
// следующий тик просто не попадал в минуту 00. Теперь есть 5 попыток, каждая
// неуспешная логируется, а lastSlotKey не даёт задвоить доставку.
//
// Безопасность от спама/двойников:
//   - lastSlotKey по локальной TZ подписчика: фаза стреляет раз в день
//     (ключ идемпотентности = подписчик + дата + фаза)
//   - Мёртвый чат (bot blocked / deactivated) → enabled=false, больше не долбим
//   - Прочие ошибки sendMessage логируем, lastSlotKey и курсор не пишем

import cron from 'node-cron'
import { db } from '../db.js'
import { sendMessage, isDeadChatError } from '../utils/tgBot.js'
import { PHASES, parsePhases } from '../utils/pushPhases.js'
import { pickNext, DEFAULT_ROTATION_MODE, normalizeMode } from '../utils/pushRotation.js'
import { getSetting, SETTING_KEYS } from '../utils/appSettings.js'

const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://all-relaxme.ru/'

// Последняя минута окна отправки внутри часа фазы (см. комментарий выше).
const SEND_WINDOW_LAST_MINUTE = 4

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

async function tick(app, now = new Date()) {

  // Все подписчики бота с живым каналом + привязанный аккаунт (если есть) для
  // audience/таймзоны. «Слать всем, кто в боте».
  //
  // Два независимых условия:
  //   enabled            — жив ли канал (не было /stop, бот не заблокирован);
  //   notificationsEnabled — тумблер «Напоминания» самого юзера.
  // Bot-only подписчик (userId = null) аккаунта не имеет, для него достаточно
  // первого условия. Выключенный тумблер отсекает подписчика ДО выбора фразы,
  // поэтому курсор ротации у него не двигается.
  const subs = await db.tgSubscriber.findMany({
    where: {
      enabled: true,
      OR: [{ userId: null }, { user: { notificationsEnabled: true } }],
    },
    include: { user: { include: { subscription: true } } },
  })

  // Режим ротации — глобальный, из CMS. Читаем раз на тик, не на подписчика.
  const mode = normalizeMode(
    await getSetting(SETTING_KEYS.pushRotationMode, DEFAULT_ROTATION_MODE)
  )

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

    if (parts.minute > SEND_WINDOW_LAST_MINUTE) continue
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

    // Следующая по ротации фраза. Курсор сохраняем ниже и только при успехе —
    // иначе упавшая отправка «съедала» бы текст.
    const rotationKey = { subscriberId_phase: { subscriberId: s.id, phase: phase.key } }
    const state = await db.pushRotationState.findUnique({ where: rotationKey })
    const picked = pickNext({ state, pool: phrases, mode })
    if (!picked) {
      app.log.warn({ phase: phase.key, audience }, 'push rotation returned nothing')
      continue
    }
    const phrase = phrases.find((p) => p.id === picked.phraseId)

    try {
      await sendMessage(Number(s.chatId), phrase.text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть приложение', web_app: { url: MINI_APP_URL } }],
          ],
        },
      })
      // Антидубль и курсор — атомарно: либо доставка засчитана целиком, либо
      // (при падении транзакции) ретрай в окне отдаст тот же текст.
      const sentAt = new Date()
      await db.$transaction([
        db.tgSubscriber.update({
          where: { id: s.id },
          data: { lastSlotKey: slotKey },
        }),
        db.pushRotationState.upsert({
          where: rotationKey,
          create: {
            subscriberId: s.id,
            phase: phase.key,
            ...picked.nextState,
            lastSentAt: sentAt,
          },
          update: { ...picked.nextState, lastSentAt: sentAt },
        }),
      ])
      app.log.info(
        {
          subId: s.id,
          chat: s.chatId?.toString(),
          userId: s.userId,
          phase: phase.key,
          audience,
          phraseId: phrase.id,
          cycle: picked.nextState.cycleNumber,
          position: picked.nextState.position,
          mode,
        },
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
        // Курсор не сдвинут — следующая попытка в окне :00–:04 отдаст тот же
        // текст. Логируем каждую неуспешную попытку с минутой окна.
        app.log.warn(
          {
            err: e.message,
            subId: s.id,
            chat: s.chatId?.toString(),
            phase: phase.key,
            phraseId: phrase.id,
            windowMinute: parts.minute,
          },
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
