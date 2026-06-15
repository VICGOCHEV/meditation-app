import { useEffect } from 'react'
import Lenis from 'lenis'

import SmokeBackground from './components/SmokeBackground'
import { LiquidGlassFilter } from './components/app/LiquidGlassFilter'
import Icon from './lib/icons'

import Hero from './sections/Hero'
import ProductShot from './sections/ProductShot'
import Thesis from './sections/Thesis'
import Architecture from './sections/Architecture'
import Timeline from './sections/Timeline'
import DesignSystem from './sections/DesignSystem'
import Atmosphere from './sections/Atmosphere'
import Journey from './sections/Journey'
import Diagnostics from './sections/Diagnostics'
import Progress from './sections/Progress'
import Backend from './sections/Backend'
import Payments from './sections/Payments'
import Cms from './sections/Cms'
import Comms from './sections/Comms'
import LandingDist from './sections/LandingDist'
import DevOps from './sections/DevOps'
import Analysis from './sections/Analysis'
import Outcome from './sections/Outcome'
import FinalCta from './sections/FinalCta'

const MARQUEE_WORDS = [
  'Дизайн-система', 'Диагностика', 'Backend', 'Платежи', 'CMS', 'Telegram', 'VK Mini App',
  'Cloudflare', 'PostgreSQL', 'Шейдеры', 'ЮKassa', 'Webhook', 'DevOps', 'all-relaxme.ru',
]
function Marquee() {
  const row = [...MARQUEE_WORDS, ...MARQUEE_WORDS]
  return (
    <div aria-hidden className="relative overflow-hidden py-8" style={{ borderTop: '1px solid rgba(180,160,255,0.08)', borderBottom: '1px solid rgba(180,160,255,0.08)' }}>
      <div className="marquee-track">
        {row.map((w, i) => (
          <span key={i} className="flex items-center font-mono text-[12px] uppercase tracking-[0.2em] text-fg-3">
            <span className="px-6">{w}</span>
            <span className="h-1 w-1 rounded-full bg-lilac/40" />
          </span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
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
      <SmokeBackground />
      <LiquidGlassFilter />

      {/* верхняя плашка */}
      <header className="fixed inset-x-0 top-0 z-40 px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-2.5"
          style={{ background: 'rgba(12,9,24,0.6)', border: '1px solid rgba(180,160,255,0.1)', backdropFilter: 'blur(14px)' }}>
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.2)' }}>
              <Icon name="sphere" size={16} />
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-fg-1">Case · Meditation App</span>
          </a>
          <a className="hidden items-center gap-2 font-mono text-[12px] text-lilac sm:inline-flex" href="https://all-relaxme.ru/" target="_blank" rel="noopener noreferrer">
            all-relaxme.ru <Icon name="arrow" size={14} />
          </a>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <Hero />
        <ProductShot />
        <Thesis />
        <Architecture />
        <Timeline />
        <Marquee />
        <DesignSystem />
        <Atmosphere />
        <Journey />
        <Diagnostics />
        <Marquee />
        <Progress />
        <Backend />
        <Payments />
        <Cms />
        <Comms />
        <LandingDist />
        <DevOps />
        <Analysis />
        <Outcome />
        <FinalCta />
      </main>

      <footer className="relative z-10 border-t px-5 py-10 text-center" style={{ borderColor: 'rgba(180,160,255,0.08)' }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
          Кейс · Мобильное веб-приложение 2026 · сервис для медитации и осознанности
        </p>
      </footer>
    </div>
  )
}
