import { api, USE_MOCK, delay } from './client'

export async function postCheckin(payload) {
  if (USE_MOCK) {
    await delay(120)
    return { ok: true, ...payload }
  }
  const { data } = await api.post('/checkin', payload)
  return data
}

export async function postDeepAnalysis(payload) {
  if (USE_MOCK) {
    await delay(150)
    return { ok: true, ...payload }
  }
  const { data } = await api.post('/deep-analysis', payload)
  return data
}
