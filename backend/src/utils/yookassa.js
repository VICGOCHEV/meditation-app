import crypto from 'node:crypto'

// Минимальная обёртка над YooKassa REST API v3 — только то, что нам нужно
// для embedded-виджета подписки. Без внешних SDK, на чистом fetch.
// Документация: https://yookassa.ru/developers/api

const API_BASE = 'https://api.yookassa.ru/v3'

function basicAuthHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secret = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secret) {
    throw new Error('YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY не сконфигурированы')
  }
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64')
}

/**
 * Создать платёж с embedded-confirmation (confirmation_token для виджета).
 *
 * @param {object} opts
 * @param {number} opts.amount — рубли, число (e.g. 199)
 * @param {string} opts.description — что покупает
 * @param {object} opts.metadata — будет в webhook, max 16 ключей
 * @returns {Promise<{id:string, confirmation:{confirmation_token:string}}>}
 */
export async function createPayment({ amount, description, metadata }) {
  const idempotenceKey = crypto.randomUUID()
  const body = {
    amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
    confirmation: { type: 'embedded' },
    capture: true,
    description,
    metadata,
  }
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`YooKassa create ${res.status}: ${text.slice(0, 200)}`)
  }
  return JSON.parse(text)
}

/**
 * Получить актуальный статус платежа (для верификации webhook).
 */
export async function getPayment(id) {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    headers: { Authorization: basicAuthHeader() },
  })
  if (!res.ok) {
    throw new Error(`YooKassa get ${res.status}`)
  }
  return await res.json()
}
