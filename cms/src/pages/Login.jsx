import { useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useAuth } from '../lib/store.js'
import { useToast } from '../ui/Toast.jsx'

// Persistent email из прошлого входа с галкой «Запомнить меня».
// Только email — пароль никогда не сохраняем в plain text.
const REMEMBERED_EMAIL_KEY = 'cms_remembered_email'

export default function Login() {
  const setAuth = useAuth((s) => s.setAuth)
  const toast = useToast()
  // По умолчанию подставляем email из последнего «помнимого» входа,
  // галка тоже остаётся включённой — 95% случаев клиент хочет тот же режим.
  const rememberedEmail = (() => {
    try { return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '' } catch { return '' }
  })()
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(rememberedEmail))
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/admin/login', { email, password, remember })
      if (remember) {
        try { localStorage.setItem(REMEMBERED_EMAIL_KEY, email) } catch { /* noop */ }
      } else {
        try { localStorage.removeItem(REMEMBERED_EMAIL_KEY) } catch { /* noop */ }
      }
      setAuth(data.token, data.admin)
    } catch (err) {
      toast.err(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      {/* мягкое фиолетовое свечение фона — без шейдеров, чистый радиальный градиент */}
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(700px 480px at 50% -120px, oklch(0.35 0.18 290 / 0.4), transparent 60%)',
        }}
      />
      <form onSubmit={submit} className="panel relative z-10 w-full max-w-sm p-7 shadow-shadow-2">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-btn text-white shadow-btn-primary">◐</span>
          <div>
            <div className="text-base font-bold text-fg-0">relaxme · CMS</div>
            <div className="text-xs text-fg-3">панель управления контентом</div>
          </div>
        </div>

        <label className="label">Email</label>
        <input
          className="input mb-3"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@all-relaxme.ru"
          required
        />

        <label className="label">Пароль</label>
        <input
          className="input mb-4"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <label className="mb-5 flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-violet"
          />
          <span className="text-sm text-fg-1">Запомнить меня</span>
          <span className="ml-auto text-[11px] text-fg-3">не вводить пароль 30 дней</span>
        </label>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
