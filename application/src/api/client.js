import axios from 'axios'

// USE_MOCK включается ТОЛЬКО явно через VITE_USE_MOCK=true. Раньше fallback
// "если VITE_API_URL пустой — включать mock" приводил к тому что в production
// без env-переменной приложение возвращало fake login/payment/progress.
// На проде Caddy проксирует /api → бэк, baseURL '/api' работает по умолчанию.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: 401 → очистка auth_token + редирект на /auth/login.
// Раньше у CMS такой интерцептор был, а у юзер-аппки нет. Из-за этого истёкшие
// сессии превращались в скрытые fallback'и (компоненты молча игнорировали
// ошибки и оставляли юзера в half-broken state).
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && localStorage.getItem('auth_token')) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      // Хард-redirect — проще чем тащить navigate через axios. Только если
      // юзер не уже на auth-странице.
      if (typeof window !== 'undefined' && !/\/auth\//.test(window.location.pathname)) {
        window.location.replace('/auth/login')
      }
    }
    return Promise.reject(err)
  },
)

export const delay = (ms) => new Promise((r) => setTimeout(r, ms))
