import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion'
import PhoneMockup from '../components/PhoneMockup'
import { ScreenHome } from '../components/AppScreens'
import ScreenVideo from '../components/ScreenVideo'
import { SecTag } from '../components/caseui'

/* Смена режима — день и ночь. Телефон крупный слева, текст наложен справа
   с мягким градиентом. По скроллу меняется hue (1:1 из useTimeTheme). */

const SLOTS = [
  { name: 'Утро', tag: 'заряжает', icon: 'sunrise', hue: 110, accent: '#ff8a6e',
    desc: 'Тёплый красный — первая чакра, корень и опора. Цвет настраивает на энергичное, заряжающее начало дня: тело просыпается, появляется тонус и желание действовать. Утренние практики короткие и бодрящие — чтобы войти в день собранным.' },
  { name: 'День', tag: 'держит фокус', icon: 'sun', hue: 0, accent: '#b9a7f0',
    desc: 'Фирменный фиолет — ясность и собранность. В самой активной части дня интерфейс держит спокойный фокус: ничего не отвлекает, легко вынырнуть на пару минут дыхания и вернуться к делам без потери ритма.' },
  { name: 'Вечер', tag: 'замедляет', icon: 'sunset', hue: 225, accent: '#5fd6a0',
    desc: 'Изумрудный покой мягко переключает с режима задач на восстановление. Цвет снижает темп, помогает отпустить прожитый день и подготовиться к более глубоким, медленным практикам — телу и уму пора выдохнуть.' },
  { name: 'Ночь', tag: 'ведёт ко сну', icon: 'moon', hue: 315, accent: '#7a8cff',
    desc: 'Глубокий индиго замедляет ум. Минимум контраста, тёплый тёмный свет — всё ведёт ко сну: дыхательные практики, телесное расслабление и тишина перед тем, как закрыть глаза и отпустить день.' },
]
const N = SLOTS.length
const STOPS = [0, 0.18, 0.27, 0.43, 0.51, 0.67, 0.75, 1]
const HUE = [110, 110, 0, 0, 225, 225, 315, 315]

function TimeIcon({ name, size = 30 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'sun') return (<svg {...c}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></svg>)
  if (name === 'moon') return (<svg {...c}><path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" /></svg>)
  if (name === 'sunset') return (<svg {...c}><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 3v5M5 9l1.4 1.4M19 9l-1.4 1.4M2 14h2M20 14h2M12 11l3-3M12 11 9 8" /></svg>)
  return (<svg {...c}><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 9V3M9 6l3-3 3 3M5 12l1.4-1.4M19 12l-1.4-1.4M2 15h2M20 15h2" /></svg>)
}

function Lotus({ color, size = 42 }) {
  return (
    <svg width={size} height={size * 0.84} viewBox="0 0 48 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${color}99)` }}>
      <path d="M24 36 C 19 25, 19 14, 24 6 C 29 14, 29 25, 24 36Z" />
      <path d="M24 36 C 15 27, 11 19, 9 11 C 18 13, 23 23, 24 36Z" />
      <path d="M24 36 C 33 27, 37 19, 39 11 C 30 13, 25 23, 24 36Z" />
      <path d="M24 36 C 11 31, 5 25, 3 19 C 13 19, 22 28, 24 36Z" opacity="0.6" />
      <path d="M24 36 C 37 31, 43 25, 45 19 C 35 19, 26 28, 24 36Z" opacity="0.6" />
      <circle cx="24" cy="33" r="2" fill={color} stroke="none" />
    </svg>
  )
}

export default function DayNight() {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 26, mass: 0.4, restDelta: 0.0003 })
  const hue = useTransform(p, STOPS, HUE)
  const filter = useTransform(hue, (h) => `hue-rotate(${h}deg)`)
  useMotionValueEvent(p, 'change', (v) => {
    const i = v < 0.25 ? 0 : v < 0.49 ? 1 : v < 0.73 ? 2 : 3
    if (i !== idx) setIdx(i)
  })

  const op0 = useTransform(p, [0, 0.18, 0.25], [1, 1, 0])
  const op1 = useTransform(p, [0.27, 0.33, 0.43, 0.49], [0, 1, 1, 0])
  const op2 = useTransform(p, [0.51, 0.57, 0.67, 0.73], [0, 1, 1, 0])
  const op3 = useTransform(p, [0.75, 0.81, 1], [0, 1, 1])
  const ops = [op0, op1, op2, op3]

  return (
    <section ref={ref} style={{ height: '480vh' }} className="relative">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-[1280px] px-5 pt-12 text-center sm:px-8 sm:pt-16">
          <SecTag num="06" className="mb-3 justify-center">Living theme</SecTag>
          <h2 className="font-display text-[clamp(1.6rem,3.8vw,2.4rem)] font-extralight leading-[1.05] text-fg-0">Смена режима — <span className="font-medium">день и ночь.</span></h2>
        </div>

        <div className="mt-4 flex items-end justify-center gap-6 sm:gap-10">
          {SLOTS.map((s, i) => {
            const on = i === idx
            return (
              <div key={s.name} className="flex flex-col items-center gap-1.5 transition-all duration-300" style={{ color: on ? s.accent : '#463e62', transform: on ? 'scale(1.15)' : 'scale(0.92)', filter: on ? `drop-shadow(0 0 12px ${s.accent}aa)` : 'none' }}>
                <TimeIcon name={s.icon} size={26} />
                <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{s.name}</span>
              </div>
            )
          })}
        </div>

        {/* DESKTOP: телефон слева крупный, текст наложен справа с градиентом */}
        <div className="mx-auto hidden w-full max-w-[1280px] flex-1 items-center px-8 lg:flex lg:gap-6">
          {/* телефон слева, крупный — придвинут ближе к тексту */}
          <motion.div className="relative flex w-[45%] shrink-0 justify-end pr-2" style={{ filter }}>
            <div className="relative" style={{ perspective: 1600 }}>
              <motion.div style={{ transform: 'rotateY(-8deg) rotateX(3deg)' }}>
                <PhoneMockup width={320} withSphere={false}><ScreenVideo src={`${import.meta.env.BASE_URL}screens/home.mp4`}><ScreenHome /></ScreenVideo></PhoneMockup>
              </motion.div>
            </div>
          </motion.div>

          {/* текст справа, наложен поверх с градиентом */}
          <div className="relative w-[55%] h-[520px]">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(10,7,20,0.6) 40%, rgba(10,7,20,0.95) 100%)' }} />
            {SLOTS.map((s, i) => (
              <motion.div key={s.name} className="absolute inset-0 flex flex-col justify-center pr-8 z-10" style={{ opacity: ops[i] }}>
                <div className="mb-4 flex"><Lotus color={s.accent} size={40} /></div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: s.accent }}>Режим · 0{i + 1}</p>
                <h3 className="mt-3 font-display leading-[1.0] text-fg-0" style={{ fontSize: 'clamp(2rem,3.8vw,3.2rem)' }}>
                  <span className="block font-extralight">{s.name}</span>
                  <span className="block font-medium pt-1" style={{ color: s.accent }}>{s.tag}.</span>
                </h3>
                <p className="mt-5 max-w-md text-[14px] leading-relaxed text-fg-2">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* MOBILE */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 lg:hidden">
          <motion.div style={{ filter }}>
            <PhoneMockup width={200} withSphere={false}><ScreenVideo src={`${import.meta.env.BASE_URL}screens/home.mp4`}><ScreenHome /></ScreenVideo></PhoneMockup>
          </motion.div>
          <div className="relative h-[200px] w-full max-w-sm">
            {SLOTS.map((s, i) => (
              <motion.div key={s.name} className="absolute inset-0 text-center" style={{ opacity: ops[i] }}>
                <div className="mb-2 flex justify-center"><Lotus color={s.accent} size={36} /></div>
                <h3 className="font-display text-[1.6rem] font-extralight text-fg-0">{s.name}</h3>
                <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-fg-2">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
