// Глобальные настройки приложения — key/value в таблице AppSetting.
//
// Заведено под два рубильника, которые владелец должен переключать из CMS без
// деплоя: режим ротации пушей и гейт по VPN. Полноценная схема настроек тут
// избыточна — значения примитивные, читаются редко.
//
// Кеш на 30 секунд: notifier дёргает настройку раз в минуту, CMS — на открытии
// страницы, поэтому «применяется без кеша дольше 1 минуты» соблюдается.

import { db } from '../db.js'

export const SETTING_KEYS = {
  pushRotationMode: 'push_rotation_mode',
  vpnGateEnabled: 'vpn_gate_enabled',
}

const CACHE_TTL_MS = 30_000
const cache = new Map() // key → { value, expires }

export async function getSetting(key, fallback = null) {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  let value = fallback
  try {
    const row = await db.appSetting.findUnique({ where: { key } })
    if (row) value = row.value
  } catch {
    // Таблицы ещё нет (миграция не накатана) — работаем на дефолте, а не падаем:
    // пуши важнее настройки.
    return fallback
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
  return value
}

export async function setSetting(key, value) {
  const row = await db.appSetting.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  })
  cache.set(key, { value: row.value, expires: Date.now() + CACHE_TTL_MS })
  return row
}

export function invalidateSettingsCache() {
  cache.clear()
}
