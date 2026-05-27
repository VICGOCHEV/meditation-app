import crypto from 'node:crypto'

/**
 * Проверка подлинности Telegram Mini App initData.
 * Алгоритм из официальной документации:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param {string} initData — raw query string from Telegram.WebApp.initData
 * @param {string} botToken — TG_BOT_TOKEN из .env
 * @returns {object|null} { id, first_name, last_name, username, ... } или null
 */
export function verifyTgInitData(initData, botToken) {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (computed !== hash) return null

  // auth_date не должен быть старше 24 часов — иначе кто-то переиспользует.
  const authDate = parseInt(params.get('auth_date') || '0', 10)
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null

  try {
    const userRaw = params.get('user')
    if (!userRaw) return null
    return JSON.parse(userRaw)
  } catch {
    return null
  }
}

/**
 * Проверка подлинности VK Mini App параметров запроса.
 * Алгоритм: https://dev.vk.com/ru/mini-apps/development/launch-parameters
 *
 * URL контейнера содержит query-параметры vk_*. Подпись формируется так:
 *   1. Берём все параметры с префиксом vk_
 *   2. Сортируем по ключу
 *   3. Собираем в query-string (k=v&k=v)
 *   4. HMAC_SHA256(query_string, SECURE_KEY) → base64url
 *   5. Сравниваем с параметром `sign`
 *
 * @param {string|URLSearchParams} searchParams — query string or instance
 * @param {string} vkSecureKey — VK_SECURE_KEY из .env
 * @returns {{vk_user_id: number}|null}
 */
export function verifyVkSign(searchParams, vkSecureKey) {
  if (!searchParams || !vkSecureKey) return null

  const params =
    typeof searchParams === 'string'
      ? new URLSearchParams(searchParams)
      : searchParams

  const sign = params.get('sign')
  if (!sign) return null

  const vkParams = Array.from(params.entries())
    .filter(([k]) => k.startsWith('vk_'))
    .sort(([a], [b]) => a.localeCompare(b))

  if (vkParams.length === 0) return null

  const queryString = vkParams
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  const computed = crypto
    .createHmac('sha256', vkSecureKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  if (computed !== sign) return null

  const vkUserId = parseInt(params.get('vk_user_id') || '0', 10)
  if (!vkUserId) return null

  return { vk_user_id: vkUserId }
}
