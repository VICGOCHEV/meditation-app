import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { Field } from './AuthShell'
import Button from '../../components/ui/Button'
import PasswordInput from './PasswordInput'
import { useAuthStore } from '../../store/useAuthStore'
import { login, tgInit, vkInit } from '../../api/auth'

// Иконка-силуэт самолётика — Telegram brand. SVG в один path чтобы не тянуть
// зависимость на icon-libs ради одной кнопки.
function TgIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192L9.85 14.585l-.314 4.708c.483 0 .695-.221.964-.483l2.305-2.247 4.788 3.539c.881.487 1.516.237 1.737-.818l3.143-14.808c.323-1.294-.49-1.881-1.808-1.659z" />
    </svg>
  )
}

// Иконка-VK. Аналогично — встроенный SVG.
function VkIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.785 16.243s.288-.032.435-.193c.135-.147.131-.422.131-.422s-.018-1.301.582-1.494c.59-.19 1.35 1.262 2.156 1.82.61.421 1.072.329 1.072.329l2.155-.03s1.127-.071.593-.96c-.044-.073-.312-.66-1.601-1.864-1.351-1.262-1.17-1.057.457-3.252.99-1.337 1.387-2.154 1.263-2.502-.118-.332-.853-.244-.853-.244l-2.446.015s-.181-.025-.315.056c-.131.078-.215.262-.215.262s-.385 1.03-.897 1.906c-1.082 1.849-1.514 1.947-1.69 1.832-.412-.267-.309-1.08-.309-1.658 0-1.804.273-2.557-.531-2.755-.267-.066-.464-.11-1.147-.117-.877-.009-1.617.003-2.038.21-.279.137-.494.443-.363.46.161.022.526.099.72.364.249.341.241 1.108.241 1.108s.143 2.105-.336 2.366c-.328.178-.778-.187-1.74-1.866-.493-.86-.866-1.812-.866-1.812s-.07-.176-.2-.27c-.155-.114-.374-.151-.374-.151l-2.325.015s-.349.01-.477.162c-.114.135-.009.413-.009.413s1.821 4.264 3.882 6.412c1.892 1.969 4.041 1.84 4.041 1.84h.971z" />
    </svg>
  )
}

// Детект платформы при mount. Возвращает {tg: initData?, vk: searchParams?}.
// Telegram WebView инжектит window.Telegram.WebApp АСИНХРОННО — поэтому
// поллим до 2 секунд прежде чем сдаться. Без polling'а у нас была гонка:
// React монтировал Login раньше чем Telegram успевал инжектить SDK.
function usePlatform() {
  const [state, setState] = useState({ tg: null, vk: null, checked: false })

  useEffect(() => {
    let cancelled = false

    // VK: синхронно из URL
    let vkSearch = null
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('vk_user_id') && params.get('sign')) {
        vkSearch = window.location.search.replace(/^\?/, '')
      }
    } catch { /* ignore */ }

    async function pollTg() {
      // 20 попыток × 100ms = 2с
      for (let i = 0; i < 20; i++) {
        if (cancelled) return null
        const wa = window.Telegram?.WebApp
        if (wa?.initData) {
          try { wa.ready?.(); wa.expand?.() } catch { /* noop */ }
          return wa.initData
        }
        await new Promise((r) => setTimeout(r, 100))
      }
      // Fallback: SDK lazy import (для случаев когда Telegram не инжектит)
      try {
        const mod = await import('@twa-dev/sdk').catch(() => null)
        const wa = mod?.default
        if (wa?.initData) {
          try { wa.ready?.(); wa.expand?.() } catch { /* noop */ }
          return wa.initData
        }
      } catch { /* not in TG */ }
      return null
    }

    pollTg().then((tg) => {
      if (!cancelled) setState({ tg, vk: vkSearch, checked: true })
    })

    return () => { cancelled = true }
  }, [])

  return state
}

// Видимый диагностический индикатор — пока ловим issues с initData.
// Удалим когда логин стабилизируется на проде.
function PlatformDebug({ platform }) {
  if (typeof window === 'undefined') return null
  const hasTelegram = !!window.Telegram
  const hasWebApp = !!window.Telegram?.WebApp
  const initLen = window.Telegram?.WebApp?.initData?.length || 0
  return (
    <div className="mt-6 rounded border border-fg-3/15 bg-bg-1 px-3 py-2 text-[10px] font-mono leading-relaxed text-fg-3">
      build v3 · checked={String(platform.checked)}
      <br />
      detected: tg={platform.tg ? `len=${platform.tg.length}` : 'null'} · vk={platform.vk ? 'yes' : 'null'}
      <br />
      window: Telegram={hasTelegram ? 'y' : 'n'} · WebApp={hasWebApp ? 'y' : 'n'} · initData={initLen}b
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)
  const platform = usePlatform()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  // 'auto' (по умолчанию: показываем платформенную кнопку если есть)
  // | 'email' (юзер кликнул «войти с почтой»)
  const [mode, setMode] = useState('auto')

  // Если платформа найдена — пытаемся сразу авто-логин (это same path как
  // usePlatformAuth, но дублируем здесь для надёжности — на случай если
  // юзер пришёл прямо на /auth/login). Ошибки выводим юзеру явно вместо
  // молчания.
  useEffect(() => {
    if (!platform.checked || loading) return
    if (mode !== 'auto') return
    if (platform.tg) {
      void platformLogin('tg', platform.tg)
    } else if (platform.vk) {
      void platformLogin('vk', platform.vk)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.checked])

  async function platformLogin(kind, payload) {
    setErr('')
    setLoading(true)
    try {
      const res = kind === 'tg' ? await tgInit(payload) : await vkInit(payload)
      if (!res?.token) throw new Error('Сервер не вернул токен')
      authLogin(res.token, res.user)
      navigate('/')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('platform login failed', e)
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        (kind === 'tg'
          ? 'Не получилось войти через Telegram. Попробуй с почтой.'
          : 'Не получилось войти через VK. Попробуй с почтой.')
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { token, user } = await login({ identifier, password })
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

  const showTgButton = platform.checked && !!platform.tg
  const showVkButton = platform.checked && !!platform.vk
  const showEmailForm = mode === 'email' || (!showTgButton && !showVkButton)

  return (
    <AuthShell title="Войти">
      {/* Telegram CTA — лиловая брендовая, иконка слева */}
      {showTgButton && (
        <button
          type="button"
          onClick={() => platformLogin('tg', platform.tg)}
          disabled={loading}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-[15px] font-medium text-white shadow-lg transition hover:bg-[#1d8dc4] active:scale-[0.98] disabled:opacity-60"
        >
          <TgIcon className="h-5 w-5" />
          {loading ? 'Входим…' : 'Войти через Telegram'}
        </button>
      )}

      {/* VK CTA */}
      {showVkButton && (
        <button
          type="button"
          onClick={() => platformLogin('vk', platform.vk)}
          disabled={loading}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077FF] px-4 py-3 text-[15px] font-medium text-white shadow-lg transition hover:bg-[#0066dd] active:scale-[0.98] disabled:opacity-60"
        >
          <VkIcon className="h-5 w-5" />
          {loading ? 'Входим…' : 'Войти через VK'}
        </button>
      )}

      {err && (showTgButton || showVkButton) && (
        <div className="mb-3 rounded-md border border-err/30 bg-err/10 px-3 py-2 text-[13px] text-err">
          {err}
        </div>
      )}

      {/* Switch на email, если на платформе */}
      {(showTgButton || showVkButton) && mode === 'auto' && (
        <button
          type="button"
          onClick={() => { setErr(''); setMode('email') }}
          className="mb-2 w-full text-center text-[13px] text-fg-3 hover:text-fg-1 transition"
        >
          или войти с почтой
        </button>
      )}

      {showEmailForm && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email или телефон">
            <input
              type="text"
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

          {err && !showTgButton && !showVkButton && (
            <div className="text-sm text-err">{err}</div>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Присоединиться
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
      )}

      <PlatformDebug platform={platform} />
    </AuthShell>
  )
}
