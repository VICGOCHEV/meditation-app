import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import AppRoutes from './routes'
import AppBackground from '../components/AppBackground'
import Preloader from '../components/Preloader'
import { useAuthStore } from '../store/useAuthStore'

function AuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const path = location.pathname
  const isPublic =
    path.startsWith('/onboarding') || path.startsWith('/auth')
  if (!isAuthenticated && !isPublic) {
    return <Navigate to="/onboarding" replace />
  }
  return null
}

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const [ready, setReady] = useState(false)
  // Routes mount only after the preloader finishes — otherwise onboarding
  // would animate hidden→visible while hidden behind the splash and the
  // user would see the final state on reveal.
  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('preloader_played') === '1'
  })

  useEffect(() => {
    restoreSession()
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk')
        .then(({ default: WebApp }) => {
          try {
            WebApp?.ready?.()
            WebApp?.expand?.()
          } catch {
            /* non-Telegram environment — ignore */
          }
        })
        .catch(() => {})
    }
    setReady(true)
  }, [restoreSession])

  // Smooth-scroll: page lags behind cursor/wheel input. Enabled on
  // pointer-able devices (skips touch-only phones where native momentum is
  // smoother and Lenis can fight gesture handlers).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    if (isCoarse) return

    const lenis = new Lenis({
      lerp: 0.07,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })
    document.documentElement.classList.add('lenis', 'lenis-smooth')

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      document.documentElement.classList.remove('lenis', 'lenis-smooth')
    }
  }, [])

  if (!ready) return null

  return (
    <>
      <AppBackground />
      <AuthGate />
      {preloaderDone && <AppRoutes />}
      <Preloader onDone={() => setPreloaderDone(true)} />
    </>
  )
}
