import { api, USE_MOCK, delay } from './client'

export async function login({ identifier, password, remember }) {
  if (USE_MOCK) {
    await delay(400)
    if (!identifier || !password) throw new Error('Введите данные для входа')
    return {
      token: 'mock_token_' + Date.now(),
      user: { id: 1, email: identifier, name: identifier.split('@')[0] || 'Практик' },
    }
  }
  const { data } = await api.post('/auth/login', { identifier, password, remember })
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

// Подтверждение reset'а: меняем пароль по одноразовому токену из письма.
// Возвращает JWT — после успеха сразу логиним юзера.
export async function resetPasswordConfirm({ token, password }) {
  if (USE_MOCK) {
    await delay(400)
    return {
      ok: true,
      token: 'mock_token_' + Date.now(),
      user: { id: 1, email: 'mock@example.com', name: 'Практик' },
    }
  }
  const { data } = await api.post('/auth/reset/confirm', { token, password })
  return data
}

// Telegram Mini App auto-login. Передаём Telegram.WebApp.initData
// (URL-encoded query string), сервер проверяет HMAC через TG_BOT_TOKEN.
export async function tgInit(initData) {
  if (USE_MOCK) {
    await delay(300)
    return {
      ok: true,
      token: 'mock_tg_' + Date.now(),
      user: { id: 'tg_mock', name: 'Telegram Mock' },
    }
  }
  const { data } = await api.post('/auth/tg-init', { initData })
  return data
}

// VK Mini App auto-login. Передаём raw query string из location.search
// (без leading `?`). Сервер проверяет HMAC через VK_SECURE_KEY.
export async function vkInit(searchParams) {
  if (USE_MOCK) {
    await delay(300)
    return {
      ok: true,
      token: 'mock_vk_' + Date.now(),
      user: { id: 'vk_mock', name: 'VK Mock' },
    }
  }
  const { data } = await api.post('/auth/vk-init', { searchParams })
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
