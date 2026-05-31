import { useState } from 'react'
import { api, errText } from '../lib/api.js'
import { useAuth } from '../lib/store.js'
import { useToast } from '../ui/Toast.jsx'

export default function Login() {
  const setAuth = useAuth((s) => s.setAuth)
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/admin/login', { email, password })
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
          className="input mb-5"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
