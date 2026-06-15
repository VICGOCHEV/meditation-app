import { useEffect } from 'react'
import Lenis from 'lenis'

import { LiquidGlassFilter } from './components/app/LiquidGlassFilter'
import { startPointerTracking } from './components/MouseFloat'
import Icon from './lib/icons'

import Cover from './sections/Cover'
import Manifesto from './sections/Manifesto'
import Legacy from './sections/Legacy'
import Problem from './sections/Problem'
import Foundation from './sections/Foundation'
import Journey from './sections/Journey'
import DayNight from './sections/DayNight'
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

export default function App() {
  useEffect(() => {
    startPointerTracking()
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

      {/* верхняя плашка */}
      <header className="fixed inset-x-0 top-0 z-40 px-4 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-2.5"
          style={{ background: 'rgba(12,9,24,0.6)', border: '1px solid rgba(180,160,255,0.1)', backdropFilter: 'blur(14px)' }}>
          <a href="#cover" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.2)' }}>
              <Icon name="sphere" size={16} />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-1 sm:text-[12px]">RELAX ME · Case</span>
          </a>
          <a className="hidden items-center gap-2 font-mono text-[12px] text-lilac sm:inline-flex" href="https://all-relaxme.ru/" target="_blank" rel="noopener noreferrer">
            all-relaxme.ru <Icon name="arrow" size={14} />
          </a>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <Cover />
        <Manifesto />
        <Legacy />
        <Problem />
        <Foundation />
        <Journey />
        <DayNight />
        <Cycle />
        <Voice />
        <AudioFocus />
        <Profile />
        <Monetization />
        <Infrastructure />
        <CommsMini />
        <CmsControl />
        <PromoLanding />
        <Ecosystem />
      </main>

      <footer className="relative z-10 border-t px-5 py-10 text-center" style={{ borderColor: 'rgba(180,160,255,0.08)' }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
          RELAX ME · кейс tech-wellness приложения · 2026
        </p>
      </footer>
    </div>
  )
}
