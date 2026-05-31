import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import MouseFloat from '../components/MouseFloat'

const STEPS = [
  { n: '01', title: 'Короткий чек-ин', sub: 'Четыре вопроса, меньше минуты. Приложение определяет твоё текущее состояние — Индекс Состояния.' },
  { n: '02', title: 'Практика дня', sub: 'Слушаешь сессию под свой голос и музыку. Дыхание, фокус, тело — всё ведёт к тишине.' },
  { n: '03', title: 'Через 4 дня — глубокий анализ', sub: '10 вопросов измеряют тревогу и осознанность. Видишь, как меняется состояние.' },
  { n: '04', title: 'Новый шаг открыт', sub: 'Следующая практика «Осознанности». И так до конца курса — 6 шагов, 24 дня.' },
]
const N = STEPS.length

function StepContent({ progress, i, step }) {
  const s = i / N
  const e = (i + 1) / N
  const f = (1 / N) * 0.24
  const inB = s + f
  const outA = e - f
  const opacity = useTransform(progress, [s - f * 0.5, inB, outA, e + f * 0.5], [0, 1, 1, 0])
  const x = useTransform(progress, [s, inB, outA, e], [50, 0, 0, -50])
  const blur = useTransform(progress, [s, inB, outA, e], [12, 0, 0, 12])
  const filter = useTransform(blur, (b) => `blur(${b}px)`)
  const ghostY = useTransform(progress, [s, e], [40, -40])
  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center" style={{ opacity }}>
      <motion.span
        className="pointer-events-none absolute -top-4 right-0 select-none font-display font-extralight leading-none text-transparent sm:right-6"
        style={{ fontSize: 'clamp(8rem, 26vw, 24rem)', WebkitTextStroke: '1px rgba(180,160,255,0.12)', y: ghostY }}
      >
        {step.n}
      </motion.span>
      <motion.div style={{ x, filter }} className="relative z-10 max-w-xl">
        <span className="mono text-sm text-violet">{step.n} / 0{N}</span>
        <h3 className="mt-3 font-display text-[1.9rem] font-extralight leading-[1.06] text-fg-0 sm:text-6xl">{step.title}</h3>
        <p className="mt-5 max-w-md text-base leading-relaxed text-fg-2 sm:text-lg">{step.sub}</p>
      </motion.div>
    </motion.div>
  )
}

function Node({ progress, i }) {
  const p = (i + 0.5) / N
  const lit = useTransform(progress, [p - 0.14, p], [0.18, 1])
  const scale = useTransform(progress, [p - 0.14, p, p + 0.05], [1, 1.7, 1.3])
  const glow = useTransform(lit, (l) => `0 0 ${l * 22}px rgba(214,200,255,${l * 0.9})`)
  return (
    <div className="relative flex items-center" style={{ height: `${100 / N}%` }}>
      <motion.span className="grid h-7 w-7 place-items-center rounded-full border" style={{ borderColor: 'rgba(180,160,255,0.4)', scale, boxShadow: glow, background: '#0a0714' }}>
        <motion.span className="h-2.5 w-2.5 rounded-full bg-lilac" style={{ opacity: lit }} />
      </motion.span>
      <motion.span className="mono ml-4 hidden text-xs text-fg-3 sm:block" style={{ opacity: lit }}>ШАГ {i + 1}</motion.span>
    </div>
  )
}

export default function HowItWorks() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const fillH = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  // огонёк: вваливается сверху (−20%→0), бежит вниз, на финале улетает за низ (→140%)
  const sparkTop = useTransform(scrollYProgress, [0, 0.05, 0.94, 1], ['-22%', '0%', '100%', '142%'])
  const sparkStretch = useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [2.4, 1, 1, 2.6]) // вытягивание на влёте/вылете
  const tailH = useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [70, 22, 22, 90])
  // гашение на входе/выходе — чтобы яркое свечение не обрезалось в полосу-шов на границе секции
  const sparkOpacity = useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [0, 1, 1, 0])

  return (
    <section id="how" ref={ref} style={{ height: `${N * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-8 px-5 lg:grid lg:grid-cols-[1fr,auto,1fr] lg:items-center lg:gap-14">
          {/* заголовок */}
          <MouseFloat strength={11} className="relative z-20">
            <p className="eyebrow mb-4">Система прогрессии</p>
            <h2 className="font-display text-4xl font-extralight leading-[1.04] text-fg-0 sm:text-5xl">
              Один цикл —<br />четыре дня<span className="text-violet">.</span>
            </h2>
            <p className="mt-5 max-w-xs leading-relaxed text-fg-3">
              Каждые 4 дня — новый шаг к осознанности. Простой ритм, который помогает замечать изменения.
            </p>
          </MouseFloat>

          {/* жила + огонёк (видна и на мобиле), и контент рядом */}
          <div className="flex min-h-0 flex-1 items-stretch gap-5 lg:contents">
            <div className="relative h-[52vh] w-9 shrink-0 self-center lg:h-[58vh]">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(180,160,255,0.18) 12%, rgba(180,160,255,0.18) 88%, transparent)' }} />
              <motion.div className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-lilac via-violet to-violet" style={{ height: fillH }} />
              {/* ОГОНЁК */}
              <motion.div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: sparkTop, opacity: sparkOpacity }}>
                {/* хвост-шлейф */}
                <motion.div
                  className="absolute bottom-full left-1/2 w-[3px] -translate-x-1/2 rounded-full"
                  style={{ height: tailH, background: 'linear-gradient(to top, rgba(255,240,210,0.85), rgba(214,200,255,0.4), transparent)' }}
                />
                {/* ядро огонька */}
                <motion.div
                  className="-translate-y-1/2 rounded-full"
                  style={{
                    width: 18, height: 18, scaleY: sparkStretch,
                    background: 'radial-gradient(circle, #fff 0%, #ffe6b3 25%, #d6c8ff 55%, #6145c2 80%)',
                    boxShadow: '0 0 26px 7px rgba(255,224,160,0.7), 0 0 54px 14px rgba(97,69,194,0.6)',
                  }}
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
                />
              </motion.div>
              <div className="absolute inset-0 flex flex-col">
                {STEPS.map((_, i) => (<Node key={i} progress={scrollYProgress} i={i} />))}
              </div>
            </div>

            {/* контент шага */}
            <div className="relative h-[52vh] flex-1 lg:h-[60vh]">
              {STEPS.map((step, i) => (<StepContent key={step.n} progress={scrollYProgress} i={i} step={step} />))}
            </div>
          </div>
        </div>

        <p className="absolute bottom-6 left-1/2 z-20 w-full -translate-x-1/2 px-5 text-center text-xs text-fg-4">
          Каждый месяц — новые 6 практик. Курс цикличен и повторяем.
        </p>
      </div>
    </section>
  )
}
