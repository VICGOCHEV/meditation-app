import { api, USE_MOCK, delay } from './client'

export async function createSubscription() {
  if (USE_MOCK) {
    await delay(1200)
    if (Math.random() < 0.08) throw new Error('Оплата не прошла')
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    return { ok: true, expiresAt: expires.toISOString() }
  }
  const { data } = await api.post('/subscription', {})
  return data
}

export async function cancelSubscription() {
  if (USE_MOCK) {
    await delay(200)
    return { ok: true }
  }
  const { data } = await api.delete('/subscription')
  return data
}
