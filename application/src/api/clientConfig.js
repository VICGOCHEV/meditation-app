export function shouldUseMock(env = {}) {
  return env.VITE_USE_MOCK === 'true'
}

export function apiBaseUrl(env = {}) {
  return env.VITE_API_URL || '/api'
}
