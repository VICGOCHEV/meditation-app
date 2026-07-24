import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { captureTgUser } from '../api/notify.js'

// Только TG SDK init + BackButton + тихая привязка tgUserId для пушей.
// VK auto-login вынесен в Login.jsx, чтобы НЕ блокировать рендер App.jsx.

// Тихо привязывает tgUserId текущего залогиненного юзера по initData, чтобы
// пуши доходили ВСЕМ TG-юзерам, а не только тем, кто вручную нажал
// «Подключить Telegram». Fire-and-forget, ПОСЛЕ старта приложения — момент
// начала работы не трогаем. Если юзер ещё не залогинен (токена нет) — ждём
// и повторяем несколько раз (логин обычно происходит сразу после открытия).
function scheduleTgCapture(initData) {
  if (!initData) return () => {} // не в Telegram
  if (sessionStorage.getItem('tg_captured') === '1') return () => {}
  let cancelled = false
  let tries = 0
  let timer = null
  const attempt = async () => {
    if (cancelled) return
    if (!localStorage.getItem('auth_token')) {
      if (tries++ < 15) timer = setTimeout(attempt, 2000) // до ~30с ждём логина
      return
    }
    try {
      await captureTgUser(initData)
      sessionStorage.setItem('tg_captured', '1')
    } catch {
      /* не критично: остаётся ручной deep-link в Профиле */
    }
  }
  timer = setTimeout(attempt, 1500)
  return () => { cancelled = true; if (timer) clearTimeout(timer) }
}

export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const tgRef = useRef(null)

  // TG SDK init — отдельным useEffect, без блокирующих await.
  useEffect(() => {
    let cancelled = false
    let cancelCapture = () => {}
    ;(async () => {
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
          // Привязка для пушей — только если реально внутри Telegram (initData
          // непустой). Не мешает старту, не блокирует рендер.
          cancelCapture = scheduleTgCapture(WebApp.initData)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('TG SDK load failed', e?.message || e)
      }
    })()
    return () => { cancelled = true; cancelCapture() }
  }, [])

  // TG BackButton: показываем когда не на /, скрываем на /
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
}
