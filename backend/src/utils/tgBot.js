// Минимальный клиент Telegram Bot API через fetch — без библиотек.
// Используется для:
//   - /api/tg/webhook (входящие апдейты от Telegram)
//   - setWebhook на старте сервера (один раз)
//   - sendMessage с web_app inline-кнопкой на /start
//
// Документация: https://core.telegram.org/bots/api

// На прод-сервере (РФ) исходящие на api.telegram.org режутся DPI/TSPU,
// поэтому ходим через relay (Cloudflare Worker / VPS-прокси вне РФ).
// См. docs/30-tg-relay-2026-06-01.md. В dev и в .env без переменной —
// прямой адрес.
const API_BASE = process.env.TG_API_BASE || 'https://api.telegram.org'

function token() {
  const t = process.env.TG_BOT_TOKEN
  if (!t) throw new Error('TG_BOT_TOKEN не сконфигурирован')
  return t
}

async function call(method, body) {
  const headers = { 'Content-Type': 'application/json' }
  // Если ходим через relay (CF Worker) — добавляем shared secret для отсева
  // случайных сканеров URL'а. См. docs/30-tg-relay-2026-06-01.md.
  if (process.env.TG_RELAY_SECRET) {
    headers['X-Relay-Auth'] = process.env.TG_RELAY_SECRET
  }
  const res = await fetch(`${API_BASE}/bot${token()}/${method}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) {
    const err = new Error(`TG ${method}: ${data.description || res.status}`)
    // Прокидываем код/описание Telegram, чтобы вызывающий мог отличить
    // «юзер заблокировал бота» от временной сетевой ошибки (см. isDeadChatError).
    err.code = data.error_code
    err.description = data.description || ''
    throw err
  }
  return data.result
}

// Тот же вызов, но телом идёт multipart/form-data — нужно, когда файл
// заливается БАЙТАМИ, а не ссылкой.
//
// Зачем вообще байтами: при передаче ссылки картинку скачивают серверы
// Telegram, и идти им пришлось бы на наш российский хостинг — этот путь
// (Telegram → мы) DPI режет так же, как обратный, а relay проксирует только
// исходящее направление. С multipart картинка уходит вместе с запросом через
// relay, и Telegram к нам не ходит вовсе.
//
// Relay пробрасывает content-type и сырое тело как есть (deploy/tg-relay/
// worker.js), поэтому boundary не ломается и менять Worker не требуется.
//
// fetch сам проставляет content-type с boundary по FormData — вручную его
// НЕ выставляем, иначе boundary потеряется.
async function callMultipart(method, fields, file) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue
    // Непримитивные поля Bot API ждёт JSON-строкой (reply_markup и подобные).
    form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
  form.append(
    'photo',
    new Blob([file.buffer], { type: file.contentType || 'application/octet-stream' }),
    file.filename || 'image'
  )

  const headers = {}
  if (process.env.TG_RELAY_SECRET) {
    headers['X-Relay-Auth'] = process.env.TG_RELAY_SECRET
  }
  const res = await fetch(`${API_BASE}/bot${token()}/${method}`, {
    method: 'POST',
    headers,
    body: form,
  })
  const data = await res.json()
  if (!data.ok) {
    const err = new Error(`TG ${method}: ${data.description || res.status}`)
    err.code = data.error_code
    err.description = data.description || ''
    throw err
  }
  return data.result
}

// true, если этому chat_id слать больше нет смысла: юзер заблокировал бота,
// удалил аккаунт, или чат не найден. Такого подписчика гасим (enabled=false),
// чтобы не долбить мёртвый чат на каждой фазе.
// Docs: api.telegram.org отвечает 403 "Forbidden: bot was blocked by the user"
// / "Forbidden: user is deactivated"; 400 "Bad Request: chat not found".
export function isDeadChatError(e) {
  const d = (e?.description || e?.message || '').toLowerCase()
  return (
    e?.code === 403 ||
    d.includes('bot was blocked') ||
    d.includes('user is deactivated') ||
    d.includes('chat not found') ||
    d.includes('user not found')
  )
}

export async function sendMessage(chatId, text, extra = {}) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

// Отправка фото с подписью по ССЫЛКЕ или по file_id.
//
// ⚠️ Ссылку Telegram скачивает сам, приходя на наш хост — с российского
// хостинга этот путь не работает (см. комментарий к callMultipart). Для
// картинок из CMS используйте sendPhotoFile. Здесь ссылка оставлена ради
// file_id: он выглядит так же (строка) и работает всегда.
//
// caption ограничен 1024 символами на стороне Telegram — обрезаем заранее.
export async function sendPhoto(chatId, photo, caption = '', extra = {}) {
  return call('sendPhoto', {
    chat_id: chatId,
    photo,
    caption: caption ? caption.slice(0, 1024) : undefined,
    parse_mode: 'HTML',
    ...extra,
  })
}

// Отправка фото БАЙТАМИ (multipart). `file` = { buffer, filename, contentType }.
// Лимит Telegram на загрузку фото — 10 МБ (против 5 МБ при передаче ссылкой).
//
// Возвращает Message; из него можно достать file_id (см. photoFileId) и слать
// остальным получателям уже по нему, не заливая файл повторно.
export async function sendPhotoFile(chatId, file, caption = '', extra = {}) {
  return callMultipart('sendPhoto', {
    chat_id: chatId,
    caption: caption ? caption.slice(0, 1024) : undefined,
    parse_mode: 'HTML',
    ...extra,
  }, file)
}

// file_id самой крупной версии фото из ответа sendPhoto.
// Telegram отдаёт массив размеров; последний — оригинал.
export function photoFileId(message) {
  const sizes = message?.photo
  if (!Array.isArray(sizes) || sizes.length === 0) return null
  return sizes[sizes.length - 1]?.file_id || null
}

export async function setWebhook(url, secretToken) {
  return call('setWebhook', {
    url,
    secret_token: secretToken || undefined,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  })
}

export async function getWebhookInfo() {
  return call('getWebhookInfo', {})
}

// Клавиатура с inline-кнопкой, открывающей Mini App.
//
// `web_app.url` обязательно HTTPS. Mini App должен быть настроен в
// BotFather через "Configure Mini App" (мы используем именно это —
// simple Mini App с URL, mode=Fullsize). short_name через /newapp не
// обязателен для web_app inline buttons.
//
// На старых клиентах (Mac App Store Telegram <= v6.0) WebApp.initData
// может приходить пустым — это известная проблема, лечится переходом
// на Telegram Desktop / мобильный клиент.
export function webAppKeyboard(url, label = 'Открыть приложение') {
  return {
    inline_keyboard: [
      [{ text: label, web_app: { url } }],
    ],
  }
}
