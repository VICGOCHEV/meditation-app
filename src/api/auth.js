import { api, USE_MOCK, delay } from './client'

export async function login({ identifier, password }) {
  if (USE_MOCK) {
    await delay(400)
    if (!identifier || !password) throw new Error('Введите данные для входа')
    return {
      token: 'mock_token_' + Date.now(),
      user: { id: 1, email: identifier, name: identifier.split('@')[0] || 'Практик' },
    }
  }
  const { data } = await api.post('/auth/login', { identifier, password })
  return data
}

export async function register({ identifier, password }) {
  if (USE_MOCK) {
    await delay(400)
    return { ok: true, challengeId: 'mock_challenge_' + Date.now() }
  }
  const { data } = await api.post('/auth/register', { identifier, password })
  return data
}

export async function verifyCode({ code }) {
  if (USE_MOCK) {
    await delay(400)
    if (code?.length !== 6) throw new Error('Код должен быть 6 цифр')
    return {
      token: 'mock_token_' + Date.now(),
      user: { id: 1, email: 'user@example.com', name: 'Практик' },
    }
  }
  const { data } = await api.post('/auth/verify', { code })
  return data
}

export async function resetPassword({ identifier }) {
  if (USE_MOCK) {
    await delay(400)
    return { ok: true }
  }
  const { data } = await api.post('/auth/reset', { identifier })
  return data
}

// GDPR + Apple/Google requirement — let the user wipe themselves.
// Server cascades Subscription / Checkin / KtEntry / TrackerDay /
// PracticeCompletion / UnlockedAwareness / BonusUnlock in one tx.
export async function deleteAccount() {
  if (USE_MOCK) {
    await delay(300)
    return { ok: true }
  }
  const { data } = await api.delete('/auth/me')
  return data
}
