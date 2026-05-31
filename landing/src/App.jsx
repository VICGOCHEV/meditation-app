import { useEffect, useState, lazy, Suspense } from 'react'
import Lenis from 'lenis'

import CursorTrail from './components/CursorTrail'
import { LiquidGlassFilter } from './components/LiquidGlassFilter'
import LoginOverlay from './components/LoginOverlay'
import MouseFloat, { startPointerTracking } from './components/MouseFloat'

// three-фон грузим лениво (отдельный чанк) — не блокирует первый рендер
const AppBackground = lazy(() => import('./components/AppBackground'))

import IntroJourney from './sections/IntroJourney'
import Inside from './sections/Inside'
import HowItWorks from './sections/HowItWorks'
import VoiceSound from './sections/VoiceSound'
import Tariff from './sections/Tariff'
import Faq from './sections/Faq'
import FinalCta from './sections/FinalCta'
import Footer from './sections/Footer'

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  useEffect(() => { startPointerTracking() }, [])
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true })
    window.__lenis = lenis
    let raf
    const loop = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      {/* статичный фон — виден мгновенно, пока подгружается three-шейдер */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{ background: 'radial-gradient(1100px 760px at 50% -8%, #1a1338, #0a0714 68%)' }}
      />
      <Suspense fallback={null}>
        <AppBackground />
      </Suspense>
      <LiquidGlassFilter />
      <CursorTrail />

      {/* floating-логотип и «Войти» */}
      <MouseFloat strength={6} className="pointer-events-none fixed inset-x-0 top-0 z-40 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a
            href="#"
            className="pointer-events-auto mono text-xs uppercase tracking-[0.2em] text-fg-1 transition-colors hover:text-lilac"
            data-hover
          >
            Meditation · 2026
          </a>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="pointer-events-auto rounded-full border border-line px-4 py-1.5 text-xs text-fg-1 transition-colors hover:bg-white/5"
            data-hover
          >
            Войти
          </button>
        </div>
      </MouseFloat>

      <main className="relative">
        <IntroJourney />
        <Inside />
        <HowItWorks />
        <VoiceSound />
        <Tariff />
        <Faq />
        <FinalCta />
        <Footer />
      </main>

      <LoginOverlay open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
