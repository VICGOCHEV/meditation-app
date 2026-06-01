// Cloudflare Worker: tg-relay
// Прозрачный pass-through к api.telegram.org. С прод-сервера (Selectel, RU)
// исходящие на api.telegram.org режутся DPI/TSPU, поэтому ходим через CF
// edge (за пределами РФ).
//
// ───────────────────────────────────────────────────────────────────────
// Секрет для лёгкой защиты от случайного abuse'а URL:
//   Settings → Variables and Secrets → Add variable
//     Type: Secret, Variable name: RELAY_SECRET, Value: <любая длинная строка>
//   Если переменная пустая — Worker открыт всем (не рекомендуется).
// ───────────────────────────────────────────────────────────────────────
//
// Использование с бэка (backend/src/utils/tgBot.js делает это автоматом):
//   POST https://<worker-subdomain>.workers.dev/bot<TG_BOT_TOKEN>/sendMessage
//   Headers:
//     Content-Type: application/json
//     X-Relay-Auth: <RELAY_SECRET>
//   Body:
//     { "chat_id": 12345, "text": "привет" }
//
// Worker возвращает ответ Telegram'а как есть (status + body).

export default {
  async fetch(req, env) {
    // 1. Лёгкая защита: если выставлен RELAY_SECRET, требуем такой же
    //    в заголовке X-Relay-Auth. Не криптография, просто отсев скана.
    if (env.RELAY_SECRET) {
      const auth = req.headers.get('x-relay-auth')
      if (auth !== env.RELAY_SECRET) {
        return new Response('forbidden', { status: 403 })
      }
    }

    // 2. Пробрасываем pathname+query как есть на api.telegram.org.
    const u = new URL(req.url)
    const tgUrl = `https://api.telegram.org${u.pathname}${u.search}`

    // 3. Чистые заголовки — оставляем только content-type (всё что нужно TG).
    const headers = new Headers()
    const ct = req.headers.get('content-type')
    if (ct) headers.set('content-type', ct)

    const body = ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : await req.arrayBuffer()

    try {
      const tg = await fetch(tgUrl, { method: req.method, headers, body })
      return new Response(tg.body, {
        status: tg.status,
        headers: {
          'content-type': tg.headers.get('content-type') || 'application/json',
        },
      })
    } catch (e) {
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 502,
          description: `relay fetch failed: ${e.message}`,
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      )
    }
  },
}
