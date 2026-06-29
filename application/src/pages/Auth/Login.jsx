import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { useAuthStore } from '../../store/useAuthStore'
import { login } from '../../api/auth'

const REMEMBERED_EMAIL_KEY = 'app_remembered_email'

// Если в URL есть параметры VK Mini App (vk_user_id + sign) — юзер
// пришёл из vk.com/app54600947. Один раз пробуем бесшовно залогинить.
function hasVkParams() {
  if (typeof window === 'undefined') return false
  const sp = new URLSearchParams(window.location.search.replace(/^\?/, ''))
  return sp.has('vk_user_id') && sp.has('sign')
}

export default function Login() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)
  const isAuthed = useAuthStore((s) => s.isAuthenticated)

  // vkAuthing — локальный флаг ТОЛЬКО для Login. Не блокирует другие
  // экраны. Если что-то залипнет — safety 5с снимет, юзер увидит форму.
  const [vkAuthing, setVkAuthing] = useState(() => !isAuthed && hasVkParams())

  const rememberedEmail = (() => {
    try { return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '' } catch { return '' }
  })()
  const [identifier, setIdentifier] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(rememberedEmail))
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // VK auto-login — один раз при mount Login.jsx если есть VK params.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasVkParams()) return
    if (useAuthStore.getState().isAuthenticated) {
      setVkAuthing(false)
      return
    }
    let alive = true

    // Safety: через 5с снимаем флаг что бы ни случилось — юзер увидит форму.
    const safety = setTimeout(() => {
      if (alive) {
        // eslint-disable-next-line no-console
        console.warn('[VK] safety timeout — показываем форму')
        setVkAuthing(false)
      }
    }, 5000)

    // Снимаем splash VK fire-and-forget (не блокирует).
    import('@vkontakte/vk-bridge')
      .then((m) => { try { m.default.send('VKWebAppInit') } catch { /* noop */ } })
      .catch(() => { /* noop */ })

    const searchParams = window.location.search.replace(/^\?/, '')
    // eslint-disable-next-line no-console
    console.log('[VK] auto-login start')

    fetch('/api/auth/vk-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchParams }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((data) => {
        if (!alive) return
        if (!data?.token || !data?.user) throw new Error('no token in response')
        // eslint-disable-next-line no-console
        console.log('[VK] login ok, user.id =', data.user?.id)
        useAuthStore.getState().login(data.token, data.user)
        try { window.history.replaceState({}, '', window.location.pathname || '/') } catch { /* noop */ }
        try { window.location.replace('/') } catch { window.location.href = '/' }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[VK] auto-login failed:', e?.message || e)
      })
      .finally(() => {
        clearTimeout(safety)
        if (alive) setVkAuthing(false)
      })

    return () => { alive = false; clearTimeout(safety) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Пока идёт VK auto-init — показываем компактный спиннер ВНУТРИ AuthShell.
  // Не блокирующий, не глобальный, не способный убить ни один другой экран.
  if (vkAuthing) {
    return (
      <AuthShell title="Войти">
        <div className="flex flex-col items-center gap-5 py-12">
          <div className="relative h-12 w-12">
            <span className="absolute inset-0 rounded-full border-2 border-lilac/15" />
            <span
              className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-lilac"
              style={{ animationDuration: '1.1s' }}
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
