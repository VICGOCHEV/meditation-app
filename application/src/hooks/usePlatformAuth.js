import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { vkInit } from '../api/auth'

// Инициализация TG и VK Mini App SDK + бесшовный VK auto-login.
//
// VK auto-login:
//   Если URL содержит параметры подписи VK Mini App (`vk_user_id` +
//   `sign`), это значит юзер пришёл из vk.com/app54600947. Сразу шлём
//   их на /api/auth/vk-init — бэк валидирует HMAC через VK_SECURE_KEY
//   и отдаёт JWT. Внутри App.jsx этот хук возвращает `vkAuthing` —
//   пока true, App не монтирует роуты (юзер видит штатный Preloader,
//   а к моменту его окончания мы уже залогинены).
//
// TG auto-login пока не делается — клиент решил, что юзер должен
// видеть Login-экран с кнопкой. См. /pages/Auth/Login.jsx.
//
// Дополнительно хук:
// 1. Лениво подгружает @twa-dev/sdk и зовёт WebApp.ready/expand —
//    без этого TG висит «лоадингом» сверху.
// 2. Подгоняет headerColor/backgroundColor под тёмную тему.
// 3. Управляет TG BackButton (show/hide + bind to navigate(-1)).
function detectVkParams() {
  if (typeof window === 'undefined') return null
  const search = window.location.search.replace(/^\?/, '')
  const hashRaw = window.location.hash.replace(/^#/, '')
  const fromHash = hashRaw.includes('?')
    ? hashRaw.split('?').slice(1).join('?')
    : hashRaw
  const raw = search.includes('vk_user_id') ? search
            : fromHash.includes('vk_user_id') ? fromHash
            : ''
  return raw || null
}

export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const tgRef = useRef(null)

  // VK auto-login state. Инициализируется СРАЗУ (sync) — чтобы App.jsx
  // решил «монтировать роуты или ждать» до первого commit'а.
  const [vkAuthing, setVkAuthing] = useState(() => {
    if (typeof window === 'undefined') return false
    if (useAuthStore.getState().isAuthenticated) return false
    return Boolean(detectVkParams())
  })

  const authLogin = useAuthStore((s) => s.login)

  // === Init: TG SDK + VK Bridge + VK auto-login ============================
  useEffect(() => {
    let cancelled = false

    async function initTg() {
      try {
        const mod = await import('@twa-dev/sdk')
        if (cancelled) return
        const WebApp = mod.default
        if (WebApp) {
          tgRef.current = WebApp
          try {
            WebApp.ready?.()
            WebApp.expand?.()
            WebApp.setHeaderColor?.('#0a0714')
            WebApp.setBackgroundColor?.('#11101a')
          } catch { /* non-fatal */ }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('TG SDK load failed', e?.message || e)
      }
    }

    async function initVk() {
      const raw = detectVkParams()
      if (!raw) return

      // 1. Снимаем splash VK fire-and-forget. await зависнет если
      //    Bridge не получит ответ от parent-кабинета (например, наша
      //    аппка открыта НЕ через vk.com iframe). Без этого юзер
      //    видел только дым на фоне и больше ничего.
      import('@vkontakte/vk-bridge')
        .then((m) => { try { m.default.send('VKWebAppInit') } catch { /* noop */ } })
        .catch(() => { /* Bridge не загрузился — пофиг, бэк подпись проверит сам */ })

      // 2. Hard safety: если что-то пойдёт совсем не так — через 10с
      //    принудительно снимаем vkAuthing, юзер увидит обычный Login.
      //    Лучше показать форму, чем висеть на дыме навечно.
      const safetyTimer = setTimeout(() => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('VK auto-init: safety timeout, falling back to login form')
          setVkAuthing(false)
        }
      }, 10000)

      if (cancelled) { clearTimeout(safetyTimer); return }

      // 3. Если юзер уже залогинен — пропускаем
      if (useAuthStore.getState().isAuthenticated) {
        clearTimeout(safetyTimer)
        setVkAuthing(false)
        return
      }

      // 4. POST /api/auth/vk-init с явным AbortController-таймаутом 8с
      try {
        const ctl = new AbortController()
        const fetchTimer = setTimeout(() => ctl.abort(), 8000)
        let res
        try {
          res = await vkInit(raw, { signal: ctl.signal })
        } finally {
          clearTimeout(fetchTimer)
        }
        if (cancelled) return
        if (res?.token && res?.user) {
          authLogin(res.token, res.user)
          try {
            const cleanPath = window.location.pathname || '/'
            window.history.replaceState({}, '', cleanPath)
          } catch { /* noop */ }
          navigate('/', { replace: true })
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('VK auto-init failed', e?.response?.data?.error || e?.message || e)
      } finally {
        clearTimeout(safetyTimer)
        if (!cancelled) setVkAuthing(false)
      }
    }

    initTg()
    initVk()
    return () => { cancelled = true }
  }, [authLogin, navigate])

  // === TG BackButton =======================================================
  useEffect(() => {
    const WebApp = tgRef.current
    if (!WebApp?.BackButton) return
    const onClick = () => {
      try { navigate(-1) } catch { /* ignore */ }
    }
    if (location.pathname === '/') {
      WebApp.BackButton.hide?.()
      WebApp.BackButton.offClick?.(onClick)
    } else {
      WebApp.BackButton.show?.()
      WebApp.BackButton.onClick?.(onClick)
    }
    return () => {
      WebApp.BackButton?.offClick?.(onClick)
    }
  }, [location.pathname, navigate])

  return { vkAuthing }
}
