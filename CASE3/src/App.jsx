import { useEffect } from 'react'
import Lenis from 'lenis'

import { LiquidGlassFilter } from './components/app/LiquidGlassFilter'
import { startPointerTracking } from './components/MouseFloat'
import { startIframeCursorBridge } from './components/iframeCursorBridge'

import Cover from './sections/Cover'
import Manifesto from './sections/Manifesto'
import Legacy from './sections/Legacy'
import Problem from './sections/Problem'
import Thesis from './sections/Thesis'
import Foundation from './sections/Foundation'
import Journey from './sections/Journey'
import Diagnostics from './sections/Diagnostics'
import DayNight from './sections/DayNight'
import Atmosphere from './sections/Atmosphere'
import Voice from './sections/Voice'
import AudioFocus from './sections/AudioFocus'
import Cycle from './sections/Cycle'
import Profile from './sections/Profile'
import Monetization from './sections/Monetization'
import Infrastructure from './sections/Infrastructure'
import CommsMini from './sections/CommsMini'
import CmsControl from './sections/CmsControl'
import PromoLanding from './sections/PromoLanding'
import Ecosystem from './sections/Ecosystem'
import Analysis from './sections/Analysis'
import Outcome from './sections/Outcome'
import FinalCta from './sections/FinalCta'

export default function App() {
  useEffect(() => {
    startPointerTracking()
    startIframeCursorBridge()
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true })
    let raf
    const loop = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      <LiquidGlassFilter />

      <main id="top" className="relative z-10">
        <Cover />
        <Manifesto />
        <Legacy />
        <Problem />
        <Thesis />
        <Foundation />
        <Journey />
        <Diagnostics />
        <Cycle />
        <DayNight />
        <Atmosphere />
        <Voice />
        <AudioFocus />
        <Profile />
        <Monetization />
        <Infrastructure />
        <CommsMini />
        <CmsControl />
        <PromoLanding />
        <Ecosystem />
        <Analysis />
        <Outcome />
        <FinalCta />
      </main>

      <footer className="relative z-10 border-t px-5 py-10 text-center" style={{ borderColor: 'rgba(180,160,255,0.08)' }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
          RELAX ME · кейс tech-wellness приложения · 2026
        </p>
      </footer>
    </div>
  )
}
