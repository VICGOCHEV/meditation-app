import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Только TG SDK init + BackButton. VK auto-login вынесен в Login.jsx,
// чтобы НЕ блокировать рендер App.jsx ни при каких обстоятельствах.

export default function usePlatformAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const tgRef = useRef(null)

  // TG SDK init — отдельным useEffect, без блокирующих await.
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
