import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import AppRoutes from './routes'
import AppBackground from '../components/AppBackground'
import Preloader from '../components/Preloader'
import BottomNav from '../components/ui/BottomNav'
import { LiquidGlassFilter } from '../components/ui/LiquidGlass'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'
import { useCheckinStore } from '../store/useCheckinStore'
import useTimeTheme from '../hooks/useTimeTheme'
import usePlatformAuth from '../hooks/usePlatformAuth'

// Routes where the persistent BottomNav should appear. Lifted out of the
// pages so the bar stays mounted across navigation — this lets Framer
// Motion `layoutId` animate the active pill from one tab to the other
// instead of cross-fading the whole nav.
const NAV_ROUTES = ['/', '/profile']
function ShouldShowNav() {
  const { pathname } = useLocation()
  return NAV_ROUTES.includes(pathname) ? <BottomNav /> : null
}

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
  useTimeTheme()
  // TG/VK auto-auth + BackButton + header colors. No-op в обычном браузере.
  // vkAuthing=true пока идёт бесшовный VK Mini App auto-login — на это
  // время не монтируем роуты (юзер видит штатный Preloader, к моменту
  // его окончания мы уже залогинены).
  const { vkAuthing } = usePlatformAuth()
  // Routes mount only after the preloader finishes — otherwise onboarding
  // would animate hidden→visible while hidden behind the splash and the
  // user would see the final state on reveal.
  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('preloader_played') === '1'
  })

  const flushPendingCompletions = useProgressStore((s) => s.flushPendingCompletions)
  const flushPendingCheckin = useCheckinStore((s) => s.flushPendingSync)

  useEffect(() => {
    restoreSession()
    setReady(true)
    // Retry pending API-writes которые упали из-за сетевых сбоев в прошлой
    // сессии — checkin и practice completion. Если очереди пусты или
    // юзер не залогинен — функции тихо вернутся.
    flushPendingCheckin?.()
    flushPendingCompletions?.()
  }, [restoreSession, flushPendingCheckin, flushPendingCompletions])

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
      <LiquidGlassFilter />
      <AuthGate />
      {preloaderDone && !vkAuthing && <AppRoutes />}
      {preloaderDone && !vkAuthing && <ShouldShowNav />}
      {/* Видимый индикатор пока идёт VK auto-login — без него юзер видел
          только фон с дымом и не понимал что происходит. */}
      {preloaderDone && vkAuthing && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 pointer-events-none">
          <div className="relative h-14 w-14">
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
      )}
      <Preloader onDone={() => setPreloaderDone(true)} />
    </>
  )
}
