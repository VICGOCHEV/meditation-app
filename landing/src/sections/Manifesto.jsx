import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SymBlob, SymRipple, SymWave, SymOrbit, SymConstellation } from '../components/OrbSymbols'

const SCENES = [
  { Sym: SymBlob, n: '01', text: 'Ты не обязан быть продуктивным каждую секунду.' },
  { Sym: SymRipple, n: '02', text: 'Тишина — это навык. Ему можно научиться.' },
  { Sym: SymWave, n: '03', text: 'Дыхание возвращает тебя в настоящий момент.' },
  { Sym: SymOrbit, n: '04', text: 'Несколько минут в день меняют то, как ты слышишь себя.' },
  { Sym: SymConstellation, n: '05', text: 'Путь к себе начинается с одной паузы.' },
]
const N = SCENES.length

// Одна «сцена»: текст выплывает из расфокуса в резкость и уходит вглубь.
function Scene({ progress, i, Sym, n, text }) {
  const w = 1 / N
  const s = i * w
  const e = (i + 1) * w
  const f = w * 0.24 // длина «въезда/выезда»; между ними — плато удержания
  const inB = s + f
  const outA = e - f

  // резкость и масштаб ДЕРЖАТСЯ на плато [inB, outA], а не мгновенно
  const opacity = useTransform(progress, [s - f * 0.5, inB, outA, e + f * 0.5], [0, 1, 1, 0])
  const scale = useTransform(progress, [s, inB, outA, e], [1.28, 1, 1, 0.78])
  const blur = useTransform(progress, [s, inB, outA, e], [16, 0, 0, 16])
  const filter = useTransform(blur, (b) => `blur(${b}px)`)
  const y = useTransform(progress, [s, inB, outA, e], [60, 0, 0, -60])

  const symScale = useTransform(progress, [s, inB, outA, e], [0.7, 1.15, 1.3, 1.7])
  const symRot = useTransform(progress, [s, e], [-40, 40])
  const symOpacity = useTransform(progress, [s - f * 0.5, inB, outA, e + f * 0.5], [0, 0.5, 0.5, 0])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center px-6" style={{ opacity }}>
      {/* символ за текстом */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ scale: symScale, rotate: symRot, opacity: symOpacity }}
      >
        <div className="scale-[1.8] sm:scale-[2.6]">
          <Sym />
        </div>
      </motion.div>

      {/* текст */}
      <motion.div style={{ scale, filter, y }} className="relative z-10 max-w-4xl text-center">
        <span className="mono text-sm text-violet">{n}</span>
        <p className="mt-5 font-display text-[2.1rem] font-extralight leading-[1.08] text-fg-0 sm:text-6xl">
          {text}
        </p>
      </motion.div>
    </motion.div>
  )
}

export default function Manifesto() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="manifesto" ref={ref} style={{ height: `${N * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* подпись */}
        <div className="pointer-events-none absolute left-5 top-24 z-20 sm:left-10">
          <p className="eyebrow">Манифест тишины</p>
        </div>

        {/* сцены */}
        {SCENES.map((sc, i) => (
          <Scene key={sc.n} progress={scrollYProgress} i={i} {...sc} />
        ))}

        {/* индикатор-точки */}
        <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
          {SCENES.map((_, i) => (
            <Dot key={i} progress={scrollYProgress} i={i} />
          ))}
        </div>

        {/* прогресс снизу */}
        <div className="absolute bottom-10 left-5 right-5 mx-auto h-px max-w-6xl bg-line sm:left-10 sm:right-10">
          <motion.div style={{ scaleX: barScale }} className="h-full origin-left bg-gradient-to-r from-violet to-lilac" />
        </div>
      </div>
    </section>
  )
}

function Dot({ progress, i }) {
  const w = 1 / N
  const o = useTransform(progress, [i * w, (i + 0.5) * w, (i + 1) * w], [0.25, 1, 0.25])
  const sc = useTransform(progress, [i * w, (i + 0.5) * w, (i + 1) * w], [1, 1.8, 1])
  return <motion.span className="block h-1.5 w-1.5 rounded-full bg-lilac" style={{ opacity: o, scale: sc }} />
}
