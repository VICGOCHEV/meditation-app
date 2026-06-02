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

function VkIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.785 16.243s.288-.032.435-.193c.135-.147.131-.422.131-.422s-.018-1.301.582-1.494c.59-.19 1.35 1.262 2.156 1.82.61.421 1.072.329 1.072.329l2.155-.03s1.127-.071.593-.96c-.044-.073-.312-.66-1.601-1.864-1.351-1.262-1.17-1.057.457-3.252.99-1.337 1.387-2.154 1.263-2.502-.118-.332-.853-.244-.853-.244l-2.446.015s-.181-.025-.315.056c-.131.078-.215.262-.215.262s-.385 1.03-.897 1.906c-1.082 1.849-1.514 1.947-1.69 1.832-.412-.267-.309-1.08-.309-1.658 0-1.804.273-2.557-.531-2.755-.267-.066-.464-.11-1.147-.117-.877-.009-1.617.003-2.038.21-.279.137-.494.443-.363.46.161.022.526.099.72.364.249.341.241 1.108.241 1.108s.143 2.105-.336 2.366c-.328.178-.778-.187-1.74-1.866-.493-.86-.866-1.812-.866-1.812s-.07-.176-.2-.27c-.155-.114-.374-.151-.374-.151l-2.325.015s-.349.01-.477.162c-.114.135-.009.413-.009.413s1.821 4.264 3.882 6.412c1.892 1.969 4.041 1.84 4.041 1.84h.971z" />
    </svg>
  )
}

// Детект платформы при mount.
// Возвращает {tgCtx, tgData, vk, checked}:
//   tgCtx  — есть ли в принципе TG-контекст (window.Telegram.WebApp заинжектен)
//   tgData — реальный initData для авто-входа. Может быть пустым даже в TG
//            (старые macOS клиенты дают tgCtx=true но tgData=null)
//   vk     — VK Mini App search params
// Если tgCtx=true но tgData=null — мы всё равно показываем кнопку TG,
// при клике объясняем юзеру что не так и просим открыть в другом клиенте.
function usePlatform() {
  const [state, setState] = useState({ tgCtx: false, tgData: null, vk: null, checked: false })

  useEffect(() => {
    let cancelled = false

    let vkSearch = null
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('vk_user_id') && params.get('sign')) {
        vkSearch = window.location.search.replace(/^\?/, '')
      }
    } catch { /* ignore */ }

    async function pollTg() {
      // Поллим 2 секунды: window.Telegram.WebApp иногда инжектится
      // асинхронно (особенно при первом запуске).
      for (let i = 0; i < 20; i++) {
        if (cancelled) return { tgCtx: false, tgData: null }
        const wa = window.Telegram?.WebApp
        if (wa) {
          try { wa.ready?.(); wa.expand?.() } catch { /* noop */ }
          if (wa.initData) return { tgCtx: true, tgData: wa.initData }
          // Контекст есть, данных нет — подождём ещё пару тиков
          if (i >= 15) return { tgCtx: true, tgData: null }
        }
        await new Promise((r) => setTimeout(r, 100))
      }
      // Fallback через SDK lazy import
      try {
        const mod = await import('@twa-dev/sdk').catch(() => null)
        const wa = mod?.default
        if (wa) {
          try { wa.ready?.(); wa.expand?.() } catch { /* noop */ }
          return { tgCtx: true, tgData: wa.initData || null }
        }
      } catch { /* not in TG */ }
      return { tgCtx: false, tgData: null }
    }

    pollTg().then(({ tgCtx, tgData }) => {
      if (!cancelled) setState({ tgCtx, tgData, vk: vkSearch, checked: true })
    })

    return () => { cancelled = true }
  }, [])

  return state
}

export default function Login() {
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)
  const platform = usePlatform()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  // 'platform' — показываем большую кнопку TG/VK + ссылку на email
  // 'email'    — юзер кликнул «или войти по почте», раскрылась форма
  const [mode, setMode] = useState('platform')

  async function onTgClick() {
    setErr('')
    // Если initData в этом клиенте не пришла (например, Mac App Store TG ≤ v6.0)
    // — объясняем юзеру что не так, не дёргаем бэк впустую.
    if (!platform.tgData) {
      setErr(
        'Этот Telegram-клиент не передаёт данные сессии. Открой бота на телефоне ' +
        'или в Telegram Desktop — там вход через TG сработает в один клик.'
      )
      return
    }
    setLoading(true)
    try {
      const res = await tgInit(platform.tgData)
      if (!res?.token) throw new Error('Сервер не вернул токен')
      authLogin(res.token, res.user)
      navigate('/')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('TG login failed', e)
      setErr(
        e?.response?.data?.error ||
        e?.message ||
        'Не получилось войти через Telegram. Попробуй с почтой.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function onVkClick() {
    if (!platform.vk) {
      setErr('Не получилось получить данные сессии VK. Войди через почту.')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const res = await vkInit(platform.vk)
      if (!res?.token) throw new Error('Сервер не вернул токен')
      authLogin(res.token, res.user)
      navigate('/')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('VK login failed', e)
      setErr(
        e?.response?.data?.error ||
        e?.message ||
        'Не получилось войти через VK. Попробуй с почтой.'
      )
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

  // Показываем TG/VK кнопку если есть хоть какой-то контекст платформы:
  // - TG-кнопку → если window.Telegram.WebApp заинжектен (tgCtx=true), даже
  //   если initData пустая. Юзер не должен «теряться» в email-форме когда
  //   зашёл из TG — пусть видит кнопку, при клике объясним проблему.
  // - VK-кнопку → только если есть валидные params (sign+vk_user_id).
  const showTgButton = platform.checked && platform.tgCtx && mode === 'platform'
  const showVkButton = platform.checked && !!platform.vk && mode === 'platform'
  const showEmailForm =
    mode === 'email' || (platform.checked && !platform.tgCtx && !platform.vk)

  return (
    <AuthShell title="Войти">
      {/* TG / VK CTA в нашем стиле (ShinyButton — фирменная фиолетовая
          с бегущим блеском по контуру, как везде в аппке). Иконка
          платформы слева в кнопке для узнаваемости. */}
      {showTgButton && (
        <Button size="lg" fullWidth loading={loading} onClick={onTgClick}>
          <span className="inline-flex items-center justify-center gap-2">
            <TgIcon className="h-5 w-5" />
            Войти через Telegram
          </span>
        </Button>
      )}

      {showVkButton && (
        <Button size="lg" fullWidth loading={loading} onClick={onVkClick}>
          <span className="inline-flex items-center justify-center gap-2">
            <VkIcon className="h-5 w-5" />
            Войти через VK
          </span>
        </Button>
      )}

      {err && (showTgButton || showVkButton) && (
        <div className="mt-3 rounded-md border border-err/30 bg-err/10 px-3 py-2 text-[13px] text-err">
          {err}
        </div>
      )}

      {(showTgButton || showVkButton) && (
        <button
          type="button"
          onClick={() => { setErr(''); setMode('email') }}
          className="mt-4 w-full text-center text-[13px] text-fg-3 hover:text-fg-1 transition"
        >
          или войти по почте
        </button>
      )}

      {/* Лоадер пока детект ещё не закончился — чтобы юзер не видел
          email-форму на долю секунды если auto-detect вот-вот придёт. */}
      {!platform.checked && (
        <div className="flex flex-col items-center gap-3 py-6 text-fg-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-fg-3/40 border-t-lilac" />
          <span className="text-[12px]">Проверяем способ входа…</span>
        </div>
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
    </AuthShell>
  )
}
