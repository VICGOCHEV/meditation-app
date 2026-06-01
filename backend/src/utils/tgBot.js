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
    throw new Error(`TG ${method}: ${data.description || res.status}`)
  }
  return data.result
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
// `web_app.url` обязательно HTTPS (Telegram требование).
export function webAppKeyboard(url, label = 'Открыть приложение') {
  return {
    inline_keyboard: [
      [{ text: label, web_app: { url } }],
    ],
  }
}
