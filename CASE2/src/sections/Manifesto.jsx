import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { SymBlob, SymRipple, SymWave, SymOrbit, SymConstellation } from '../components/OrbSymbols'
import { SecTag } from '../components/caseui'

/* Вторая секция — манифест. Фразы просто мягко появляются и уходят в фейд
   (без 3D-полёта и blur-по-скроллу — это грузило процессор). Дёшево и плавно. */
const PHRASES = [
  { Sym: SymBlob, n: '01', a: 'Ты не обязан быть продуктивным', b: 'каждую секунду.' },
  { Sym: SymRipple, n: '02', a: 'Тишина — это навык.', b: 'Ему можно научиться.' },
  { Sym: SymWave, n: '03', a: 'Дыхание возвращает тебя', b: 'в настоящий момент.' },
  { Sym: SymOrbit, n: '04', a: 'Несколько минут в день меняют', b: 'то, как ты слышишь себя.' },
  { Sym: SymConstellation, n: '05', a: 'Путь к себе начинается', b: 'с одной паузы.' },
]
const N = PHRASES.length

function Phrase({ progress, i, Sym, n, a, b }) {
  const seg = 1 / N
  const s = i * seg, e = (i + 1) * seg, f = seg * 0.28
  const lo = i === 0 ? -1 : s - f
  const hi = i === N - 1 ? 2 : e + f
  const opacity = useTransform(progress, [lo, s + f, e - f, hi], [0, 1, 1, 0])
  const y = useTransform(progress, [lo, s + f, e - f, hi], [26, 0, 0, -26])
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center px-6 text-center" style={{ opacity }}>
      <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-40">
        <div className="scale-[1.7] sm:scale-[2.3]"><Sym /></div>
      </div>
      <motion.div className="relative max-w-4xl" style={{ y }}>
        <span className="mono block text-sm text-violet">{n}</span>
        <p className="mt-4 font-display text-[1.9rem] font-extralight leading-[1.1] tracking-tight text-fg-1 sm:text-[3.4rem]" style={{ textShadow: '0 0 40px rgba(97,69,194,0.5)' }}>{a}</p>
        <p className="mt-1 font-display text-[1.9rem] font-medium leading-[1.1] tracking-tight text-fg-0 sm:text-[3.4rem]" style={{ textShadow: '0 0 40px rgba(97,69,194,0.5)' }}>{b}</p>
      </motion.div>
    </motion.div>
  )
}

export default function Manifesto() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.3, restDelta: 0.0005 })
  return (
    <section ref={ref} id="manifesto" style={{ height: `${N * 90}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute left-5 top-24 z-30 sm:left-8"><SecTag num="01">Манифест</SecTag></div>
        {PHRASES.map((p, i) => (<Phrase key={p.n} progress={smooth} i={i} {...p} />))}
      </div>
    </section>
  )
}
