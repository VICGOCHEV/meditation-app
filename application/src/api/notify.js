import { api, USE_MOCK, delay } from './client'

// GET /api/notify/prefs → {enabled, timezone, hasTg}
export async function getNotifyPrefs() {
  if (USE_MOCK) {
    await delay(200)
    return { enabled: true, timezone: 'Europe/Moscow', hasTg: true }
  }
  const { data } = await api.get('/notify/prefs')
  return data
}

// PATCH /api/notify/prefs {enabled?, timezone?}
export async function updateNotifyPrefs(patch) {
  if (USE_MOCK) {
    await delay(300)
    return { ok: true, ...patch }
  }
  const { data } = await api.patch('/notify/prefs', patch)
  return data
}

// POST /api/notify/test — отправить себе тестовый пуш
export async function sendTestPush() {
  if (USE_MOCK) {
    await delay(500)
    return { ok: true }
  }
  const { data } = await api.post('/notify/test', {})
  return data
}
