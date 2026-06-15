import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import ScrollScrub from '../components/ScrollScrub'
import LiveCounter from '../components/LiveCounter'

const EASE = [0.25, 1, 0.5, 1]

// Онбординг-типографика «лесенкой» — 1:1 приём из hero лендинга.
const slideVar = { hidden: {}, visible: { transition: { staggerChildren: 0.18, delayChildren: 0.15 } } }
const lineLeft = { hidden: { opacity: 0, x: -14 }, visible: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } } }
const lineRight = { hidden: { opacity: 0, x: 14 }, visible: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } } }
const lineDown = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: EASE } } }

// Hero = покадровый scroll-scrub видео-влёт (как на лендинге), доводим до
// последнего кадра. Depth-map фазу НЕ подключаем — по просьбе «без карты глубины».
export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  const cfg = isMobile ? { dir: 'frames-m', count: 97 } : { dir: 'frames', count: 121 }

  // весь скролл секции → весь кадровый ряд (до последнего кадра)
  const scrub = useTransform(scrollYProgress, [0, 1], [0, 1])

  // текст уходит первым: fade + scale (без blur по скроллу — форсит repaint)
  const textOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0])
  const textScale = useTransform(scrollYProgress, [0, 0.22], [1, 1.12])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => setFontsReady(true))
    else setFontsReady(true)
  }, [])

  return (
    <section ref={ref} style={{ height: '320vh' }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#0a0714]">
        {/* покадровый влёт на canvas */}
        <ScrollScrub key={cfg.dir} progress={scrub} dir={cfg.dir} count={cfg.count} />

        {/* атмосферная виньетка поверх кадров — текст всегда читается */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 3,
            background:
              'radial-gradient(120% 90% at 50% 35%, transparent 40%, rgba(10,7,20,0.5) 100%), linear-gradient(180deg, rgba(10,7,20,0.35), transparent 28%, transparent 68%, rgba(10,7,20,0.7))',
          }}
        />

        {/* текст hero — лесенка влево */}
        <motion.div
          className="relative z-[70] mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-between px-6 py-[13vh] sm:px-10"
          style={{ opacity: textOpacity, scale: textScale, willChange: 'transform, opacity' }}
        >
          <motion.h1
            variants={slideVar}
            initial="hidden"
            animate={fontsReady ? 'visible' : 'hidden'}
            className="mt-[6vh] w-fit text-left font-display leading-[0.92] tracking-tight text-[2.9rem] sm:text-[5.5rem]"
          >
            <motion.span variants={lineLeft} className="block font-extralight text-fg-1">Сервис для</motion.span>
            <motion.span variants={lineRight} className="block font-extralight text-fg-1 sm:pl-[1.6em]">медитации</motion.span>
            <motion.span variants={lineDown} className="block font-medium text-fg-0 sm:pl-[3.4em]">
              и осознанности<span className="text-violet">.</span>
            </motion.span>
          </motion.h1>

          <motion.div
            className="flex w-full flex-col items-center gap-5 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: fontsReady ? 1 : 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
          >
            <p className="max-w-md text-base leading-relaxed text-fg-1" style={{ textShadow: '0 2px 20px rgba(10,7,20,0.8)' }}>
              За 15 секунд — замер состояния, осознанная интерпретация и практика с живым звуком.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="eyebrow">Портфолийный кейс · 2026</span>
            </div>
            <LiveCounter />
          </motion.div>
        </motion.div>

        {/* подсказка */}
        <motion.div className="absolute bottom-6 left-1/2 z-[70] -translate-x-1/2" style={{ opacity: hintOpacity }}>
          <p className="eyebrow mb-2 text-center">провались внутрь</p>
          <div className="mx-auto flex h-10 w-6 items-start justify-center rounded-full border border-line p-1">
            <motion.div className="h-2 w-1 rounded-full bg-lilac" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
