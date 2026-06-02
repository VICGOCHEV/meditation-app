import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { tgInit, vkInit } from '../api/auth'
import { useAuthStore } from '../store/useAuthStore'

// Detect-and-auth для Telegram Mini App и VK Mini App.
//
// Что делает:
// 1. Подгружает @twa-dev/sdk (TG) лениво, вызывает WebApp.ready + expand,
//    при наличии initData делает auto-login на бэке (HMAC-проверка).
// 2. Если URL содержит vk_user_id + sign — делает auto-login для VK
//    Mini App (HMAC через VK_SECURE_KEY на бэке).
// 3. Управляет TG BackButton: show/hide и onClick → navigate(-1) для
//    всех route'ов кроме `/`.
// 4. Подгоняет TG headerColor под нашу тёмную тему.
//
// Безопасно вызывать в обычном браузере вне TG/VK — методы no-op'ятся
// через optional chaining и try/catch.
export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  // Ref на TG WebApp — переиспользуем между effects без re-import.
  const tgRef = useRef(null)
  // Чтобы не дёрнуть auth дважды (init обычно вызывается дважды в StrictMode).
  const autoAuthFired = useRef(false)

  // 1. Init + auto-auth (один раз при mount).
  useEffect(() => {
    let cancelled = false

    async function init() {
      if (typeof window === 'undefined') return

      // ───────── Telegram ─────────
      try {
        const mod = await import('@twa-dev/sdk')
        if (cancelled) return
        const WebApp = mod.default
        if (WebApp?.initData) {
          tgRef.current = WebApp
          try {
            WebApp.ready?.()
            WebApp.expand?.()
            WebApp.setHeaderColor?.('#0a0714')
            WebApp.setBackgroundColor?.('#11101a')
          } catch {
            /* ignore non-fatal TG SDK errors */
          }

          // Auto-login через initData (если ещё не залогинены)
          if (!autoAuthFired.current && !isAuthenticated) {
            autoAuthFired.current = true
            try {
              const res = await tgInit(WebApp.initData)
              if (!cancelled && res?.token && res?.user) {
                login(res.token, res.user)
              }
            } catch (e) {
              // НЕ молчим — если фронт молча fallback'ает на email,
              // юзер не понимает что произошло. Login.jsx тоже пытается
              // авто-логин и покажет внятную ошибку.
              // eslint-disable-next-line no-console
              console.warn('TG auto-login failed', e?.response?.data || e?.message || e)
            }
          }
          return
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('TG SDK load failed', e?.message || e)
      }

      // ───────── VK ─────────
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('vk_user_id') && params.get('sign')) {
          if (!autoAuthFired.current && !isAuthenticated) {
            autoAuthFired.current = true
            const raw = window.location.search.replace(/^\?/, '')
            try {
              const res = await vkInit(raw)
              if (!cancelled && res?.token && res?.user) {
                login(res.token, res.user)
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('VK auto-login failed', e?.response?.data || e?.message || e)
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // Intentionally empty deps — single init per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. TG BackButton: показываем когда не на `/`, скрываем на `/`.
  useEffect(() => {
    const WebApp = tgRef.current
    if (!WebApp?.BackButton) return
    const onClick = () => {
      try {
        navigate(-1)
      } catch {
        /* ignore navigation errors */
      }
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
