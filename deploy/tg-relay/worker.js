// Cloudflare Worker: tg-relay
// Двунаправленный relay для обхода блокировки DPI/TSPU между Selectel-сервером и Telegram.
//
//   1. Outgoing — наш бэк → Worker → api.telegram.org
//      Worker pass-through'ит запросы из tgBot.js (методы /bot<TOKEN>/sendMessage и т.п.)
//      Защита: X-Relay-Auth: <RELAY_SECRET>
//
//   2. Incoming — Telegram → Worker → наш бэк (/api/tg/webhook)
//      Webhook URL у Telegram'а указывает на Worker, потому что Telegram не может
//      достучаться к Selectel напрямую (входящие от 149.154.x.x режутся DPI).
//      Защита: X-Telegram-Bot-Api-Secret-Token (проверяет уже бэк)
//
// ───────────────────────────────────────────────────────────────────────────
// Env (Settings → Variables and Secrets):
//   RELAY_SECRET — секрет для outgoing-направления (X-Relay-Auth header).
//   BACKEND_BASE — URL нашего бэка для incoming, например https://all-relaxme.ru
//                  Если не задан — incoming-режим выключен.
// ───────────────────────────────────────────────────────────────────────────

export default {
  async fetch(req, env) {
    const u = new URL(req.url)

    // ── INCOMING: Telegram → Worker → наш бэк ───────────────────────────
    // Любой путь начинающийся с /api/ форвардим на BACKEND_BASE.
    // Используется для /api/tg/webhook. X-Relay-Auth НЕ требуем —
    // Telegram о нём не знает.
    if (u.pathname.startsWith('/api/')) {
      if (!env.BACKEND_BASE) {
        return new Response('BACKEND_BASE not configured', { status: 500 })
      }
      const backendUrl = `${env.BACKEND_BASE.replace(/\/$/, '')}${u.pathname}${u.search}`

      // Прокидываем headers полезные бэку: content-type + secret-token TG.
      const fwdHeaders = new Headers()
      const ct = req.headers.get('content-type')
      if (ct) fwdHeaders.set('content-type', ct)
      const secret = req.headers.get('x-telegram-bot-api-secret-token')
      if (secret) fwdHeaders.set('x-telegram-bot-api-secret-token', secret)

      const body = ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : await req.arrayBuffer()

      try {
        const res = await fetch(backendUrl, {
          method: req.method,
          headers: fwdHeaders,
          body,
        })
        return new Response(res.body, {
          status: res.status,
          headers: {
            'content-type': res.headers.get('content-type') || 'application/json',
          },
        })
      } catch (e) {
        // Возвращаем 200 чтобы Telegram не ретраил бесконечно. Лог в CF Worker analytics.
        return new Response(
          JSON.stringify({ ok: true, relay_error: e.message }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }
    }

    // ── OUTGOING: наш бэк → Worker → api.telegram.org ───────────────────
    if (env.RELAY_SECRET) {
      const auth = req.headers.get('x-relay-auth')
      if (auth !== env.RELAY_SECRET) {
        return new Response('forbidden', { status: 403 })
      }
    }

    const tgUrl = `https://api.telegram.org${u.pathname}${u.search}`

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
