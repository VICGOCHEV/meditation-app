import { api, USE_MOCK, delay } from './client'

// POST /api/feedback {type, message, email?, name?}
// При залогиненном юзере backend подцепит userId/email/name из JWT.
// Для анонимного — обязателен email в body.
export async function sendFeedback({ type, message, email, name }) {
  if (USE_MOCK) {
    await delay(400)
    if (!message?.trim()) throw new Error('Сообщение не может быть пустым')
    return { ok: true, id: Math.floor(Math.random() * 10000) }
  }
  const { data } = await api.post('/feedback', { type, message, email, name })
  return data
}
