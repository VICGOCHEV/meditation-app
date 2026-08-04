import { api } from './client'

// Проверка VPN на входе. Fail-open во всех смыслах: любая ошибка, таймаут или
// неожиданный ответ = «не блокируем». Свой таймаут короче общего axios'ового
// (10 с) — вход не должен ждать проверку дольше, чем она того стоит.
const CLIENT_TIMEOUT_MS = 3500

export async function checkVpn() {
  try {
    const { data } = await api.get('/vpn-check', { timeout: CLIENT_TIMEOUT_MS })
    return { gateEnabled: !!data?.gateEnabled, blocked: !!data?.blocked }
  } catch {
    return { gateEnabled: false, blocked: false }
  }
}
