import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import ParallaxHero from '../components/ParallaxHero'
import ShinyButton from '../components/ShinyButton'

const EASE = [0.25, 1, 0.5, 1]

function LiveCounter() {
  const [n, setN] = useState(248)
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => Math.min(740, Math.max(47, v + Math.round(Math.sin(Date.now() / 5000) * 3 + (Math.random() * 4 - 1.5)))))
    }, 2600)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5" style={{ background: 'rgba(12,10,24,0.45)', backdropFilter: 'blur(4px)' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-lilac" style={{ boxShadow: '0 0 8px #d6c8ff' }} />
      <span className="mono text-xs uppercase tracking-[0.18em] text-fg-1">
        В моменте <span className="text-fg-0">{n}</span>
      </span>
    </span>
  )
}

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // текст уходит первым (улетаем сквозь него), затем дайв по слоям
  const textOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0])
  const textScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.18])
  const textBlur = useTransform(scrollYProgress, [0, 0.22], [0, 10])
  const textFilter = useTransform(textBlur, (b) => `blur(${b}px)`)
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -60])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])

  return (
    <section ref={ref} style={{ height: '260vh' }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* многослойный пейзаж — проваливаемся внутрь */}
        <ParallaxHero progress={scrollYProgress} />

        {/* текст поверх сцены */}
        <motion.div
          className="relative z-[70] flex h-full flex-col items-center justify-between px-5 py-[13vh] text-center"
          style={{ opacity: textOpacity, scale: textScale, y: textY, filter: textFilter }}
        >
          <div>
            <motion.p
              className="eyebrow mb-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
            >
              Приложение · 2026
            </motion.p>
            <motion.h1
              className="text-glow-violet font-display text-[2.8rem] font-extralight leading-[1.02] sm:text-7xl"
              initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.45 }}
              style={{ textShadow: '0 4px 40px rgba(10,7,20,0.7), 0 0 50px rgba(97,69,194,0.5)' }}
            >
              Твой путь к внутренней тишине<span className="text-violet">.</span>
            </motion.h1>
          </div>

          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          >
            <p className="max-w-md text-base leading-relaxed text-fg-1" style={{ textShadow: '0 2px 20px rgba(10,7,20,0.8)' }}>
              Цифровое пространство замедления. Практики осознанности, дыхание,
              трекер состояния.
            </p>
            <ShinyButton as="a" href="#tariff">Начать</ShinyButton>
            <LiveCounter />
          </motion.div>
        </motion.div>

        {/* подсказка */}
        <motion.div className="absolute bottom-6 left-1/2 z-[70] -translate-x-1/2" style={{ opacity: hintOpacity }}>
          <p className="eyebrow mb-2 text-center">провались внутрь</p>
          <div className="mx-auto h-10 w-6 rounded-full border border-line p-1">
            <motion.div className="mx-auto h-2 w-1 rounded-full bg-lilac" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
