import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Инициализация Telegram Mini App SDK.
//
// Auto-login ОТКЛЮЧЁН — клиент решил что юзер должен видеть Login-экран
// с явной кнопкой «Войти через Telegram» (ShinyButton в фирменном стиле).
// Логин делается из Login.jsx по клику кнопки. См. /pages/Auth/Login.jsx.
//
// Что хук всё ещё делает:
// 1. Лениво подгружает @twa-dev/sdk и зовёт WebApp.ready/expand —
//    нужно чтобы Telegram нарисовал нашу аппку нормально (без этого
//    висит «лоадинг» бара сверху).
// 2. Подгоняет headerColor/backgroundColor под тёмную тему.
// 3. Управляет TG BackButton (show/hide + bind to navigate(-1)).
//
// Безопасно вызывать в обычном браузере вне TG — методы no-op'ятся через
// optional chaining и try/catch.
export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  // Ref на TG WebApp — переиспользуем между effects без re-import.
  const tgRef = useRef(null)

  // Init (один раз при mount).
  useEffect(() => {
    let cancelled = false

    async function init() {
      if (typeof window === 'undefined') return
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
          } catch {
            /* non-fatal TG SDK errors */
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('TG SDK load failed', e?.message || e)
      }
    }

    // VK Mini App init — без него splash-логотип ВК висит вечно.
    // Vk Bridge сам определяет среду (ios/android/web) и шлёт VKWebAppInit
    // в правильный канал. На обычном браузере вне VK — no-op'ит тихо.
    async function initVk() {
      try {
        const inVkContext =
          /vk_user_id|vk_app_id/.test(window.location.search) ||
          /vk_user_id|vk_app_id/.test(window.location.hash)
        if (!inVkContext) return
        const bridgeMod = await import('@vkontakte/vk-bridge')
        if (cancelled) return
        const bridge = bridgeMod.default
        // VKWebAppInit — убирает splash-screen ВК и говорит «приложение готово»
        try {
          await bridge.send('VKWebAppInit')
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('VKWebAppInit failed', e?.message || e)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('VK Bridge load failed', e?.message || e)
      }
    }

    init()
    initVk()
    return () => {
      cancelled = true
    }
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
