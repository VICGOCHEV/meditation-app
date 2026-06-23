import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

// VK Mini App auto-login + TG SDK init.
//
// VK auto-login (бесшовный):
//   Если в URL есть `vk_user_id` + `sign` — юзер из vk.com/app54600947.
//   Шлём search-params на /api/auth/vk-init (raw fetch, без axios — не
//   тянем за собой interceptors / withCredentials), бэк валидирует HMAC
//   через VK_SECURE_KEY → JWT. Сохраняем JWT в localStorage и делаем
//   window.location.replace('/') — hard reload без VK-params в URL,
//   ProtectedRoute видит токен через restoreSession() и пускает.
//
// Hard safety: 5 секунд. Если ничего не пришло — снимаем флаг,
// юзер видит обычный Login. Лучше форма, чем пустой экран.
//
// VKWebAppInit: fire-and-forget. Зависающий await раньше блокировал
// весь flow когда наш фронт открыт НЕ внутри iframe VK.

function hasVkParams(searchString) {
  if (!searchString) return false
  const sp = new URLSearchParams(searchString.replace(/^\?/, ''))
  return sp.has('vk_user_id') && sp.has('sign')
}

export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const tgRef = useRef(null)

  // Инициализируем vkAuthing синхронно — чтобы App.jsx сразу понял,
  // монтировать роуты или ждать.
  const [vkAuthing, setVkAuthing] = useState(() => {
    if (typeof window === 'undefined') return false
    if (useAuthStore.getState().isAuthenticated) return false
    return hasVkParams(window.location.search)
  })

  // === VK auto-login (mount once) =========================================
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasVkParams(window.location.search)) return

    let alive = true

    // Hard safety: что бы ни случилось — снимем флаг через 5 сек.
    const safety = setTimeout(() => {
      if (alive) {
        // eslint-disable-next-line no-console
        console.warn('[VK] safety timeout — показываем форму')
        setVkAuthing(false)
      }
    }, 5000)

    // VK Bridge VKWebAppInit — снимает splash VK. Fire-and-forget, мы
    // НЕ ждём его resolve (может зависнуть если parent-iframe не отвечает).
    import('@vkontakte/vk-bridge')
      .then((m) => { try { m.default.send('VKWebAppInit') } catch { /* noop */ } })
      .catch(() => { /* Bridge не загрузился — не критично */ })

    // Raw fetch — никаких axios-interceptors / cookie / withCredentials.
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
        if (!data?.token || !data?.user) {
          throw new Error('no token in response')
        }
        // eslint-disable-next-line no-console
        console.log('[VK] login ok, user.id =', data.user?.id)
        // Сохраняем в auth-store (он сам пишет в localStorage).
        useAuthStore.getState().login(data.token, data.user)
        // Hard navigation на чистый /  — без VK-params в URL и без
        // react-router. После reload restoreSession() прочитает JWT и
        // ProtectedRoute сразу пропустит на Home.
        try {
          window.location.replace(window.location.pathname || '/')
        } catch {
          window.location.href = '/'
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[VK] auto-login failed:', e?.message || e)
      })
      .finally(() => {
        clearTimeout(safety)
        if (alive) setVkAuthing(false)
      })

    return () => {
      alive = false
      clearTimeout(safety)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === TG SDK init (отдельно, не блокирует VK) ============================
  useEffect(() => {
    let cancelled = false
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
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('TG SDK load failed', e?.message || e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // === TG BackButton =====================================================
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
