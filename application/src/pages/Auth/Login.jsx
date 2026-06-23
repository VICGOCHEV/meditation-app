import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { useAuthStore } from '../../store/useAuthStore'
import { login } from '../../api/auth'

// Persistent email из прошлого входа с галкой «Запомнить меня».
// Сохраняем ТОЛЬКО email — пароль никогда в plain text.
const REMEMBERED_EMAIL_KEY = 'app_remembered_email'

// VK Mini App auto-login делается на app-уровне в usePlatformAuth — до
// того как router смонтирует роуты. Поэтому здесь только обычная форма.

export default function Login() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)

  const rememberedEmail = (() => {
    try { return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '' } catch { return '' }
  })()
  const [identifier, setIdentifier] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(rememberedEmail))
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { token, user } = await login({ identifier, password, remember })
      if (remember) {
        try { localStorage.setItem(REMEMBERED_EMAIL_KEY, identifier) } catch { /* noop */ }
      } else {
        try { localStorage.removeItem(REMEMBERED_EMAIL_KEY) } catch { /* noop */ }
      }
      authLogin(token, user)
      navigate('/')
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (e?.response?.status >= 500
          ? 'Мы ненадолго замедлились. Пожалуйста, попробуй чуть позже.'
          : null) ||
        e?.message ||
        'Не удалось войти'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  // === Рендер ===============================================================
  // Пока идёт VK auto-login — показываем красивый прелоадер. Не мигаем
  // формой, чтобы UX был как в нативном приложении — открыл и оказался
  // внутри без лишних движений.
  if (vkAttempting) {
    return (
      <AuthShell title="">
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full border-2 border-lilac/15"
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-lilac"
              style={{ animationDuration: '1.1s' }}
              aria-hidden="true"
            />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-lilac/70">
            ВХОДИМ ЧЕРЕЗ VK
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Войти">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {vkError && (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200/90">
            {vkError}
          </div>
        )}

        <Field label="Email">
          <input
            type="email"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="field-input"
            placeholder="you@example.com"
            autoComplete="username"
          />
        </Field>

        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-[1px] h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-line-2 bg-white/5 checked:border-lilac checked:bg-lilac/30 transition focus:outline-none focus:ring-2 focus:ring-lilac/40"
            style={{
              backgroundImage: remember
                ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23f4f0ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E\")"
                : 'none',
              backgroundSize: '12px 12px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
          <span className="text-[13px] text-fg-1">Запомнить меня</span>
          <span className="ml-auto text-[11px] text-fg-3">остаться в аккаунте на 90 дней</span>
        </label>

        {err && <div className="text-sm text-err">{err}</div>}

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Войти
        </Button>

        <div className="flex flex-col items-center gap-2 pt-4 text-[13px]">
          <Link to="/auth/register" className="text-fg-2 hover:text-fg-0">
            Нет аккаунта? <span className="text-lilac">Зарегистрироваться</span>
          </Link>
          <Link to="/auth/reset" className="text-fg-3 hover:text-fg-1">
            Забыл пароль?
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
