import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion'
import PhoneMockup from '../components/PhoneMockup'
import { SecTag } from '../components/caseui'

/* Путь пользователя — заголовок один раз сверху, затем sticky-скролл:
   крупный телефон слева (показан наполовину), справа крупный заголовок шага.
   По скроллу видео плавно перетекает: онбординг → анкетирование → индекс → плеер. */

const STEPS = [
  { n: '01', t: 'Онбординг', d: 'Мягкий вход: пролог, методология, выбор голоса и музыки. Никакой перегрузки выбором — продукт сразу задаёт состояние.', v: '/screens/onboarding.mp4' },
  { n: '02', t: 'Анкетирование', d: 'Четыре вопроса меньше минуты. Приложение считывает текущее состояние и переводит его в Индекс Состояния.', v: '/screens/checkin.mp4' },
  { n: '03', t: 'Индекс состояния', d: 'Не голая цифра, а осознанная интерпретация: ясность, поток, туман или шторм — с понятным объяснением.', v: '/screens/index.mp4' },
  { n: '04', t: 'Плеер', d: 'Практика с живым голосом и аморфной сферой, дышащей в такт. Без пауз и перемоток — только поток до конца.', v: '/screens/player.mp4' },
]
const N = STEPS.length

function VideoLayer({ src, opacity }) {
  return <motion.video src={src} autoPlay loop muted playsInline preload="auto" disablePictureInPicture className="absolute inset-0 h-full w-full object-cover" style={{ opacity }} />
}

export default function Journey() {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3, restDelta: 0.0004 })
  useMotionValueEvent(p, 'change', (v) => {
    const i = Math.min(N - 1, Math.max(0, Math.floor(v * N - 1e-4)))
    if (i !== idx) setIdx(i)
  })
  const seg = 1 / N
  const op = (i) => {
    const a = i * seg, b = (i + 1) * seg, f = seg * 0.32
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTransform(p, [i === 0 ? -1 : a - f, a + f, b - f, i === N - 1 ? 2 : b + f], [0, 1, 1, 0])
  }
  const ops = STEPS.map((_, i) => op(i))

  return (
    <>
      {/* заголовок секции — один раз */}
      <div className="mx-auto max-w-[1180px] px-5 pb-4 pt-24 sm:px-8 sm:pt-32">
        <SecTag num="05" className="mb-7">User Journey</SecTag>
        <motion.h2 initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9 }}
          className="font-display text-[clamp(2.2rem,6vw,4.2rem)] font-extralight leading-[1.02] text-fg-0" style={{ textShadow: '0 0 48px rgba(97,69,194,0.3)' }}>
          Мягкий путь<br /><span className="font-medium">к внутреннему балансу.</span>
        </motion.h2>
      </div>

      {/* sticky-скролл */}
      <section ref={ref} style={{ height: `${N * 100}vh` }} className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(80% 60% at 22% 30%, rgba(60,40,130,0.26), transparent 60%), radial-gradient(70% 55% at 85% 75%, rgba(97,69,194,0.16), transparent 60%)' }} />
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
            {/* телефон крупно, наполовину */}
            <div className="relative flex justify-center lg:justify-start">
              <div className="relative" style={{ maskImage: 'linear-gradient(180deg,#000 78%,transparent)', WebkitMaskImage: 'linear-gradient(180deg,#000 78%,transparent)' }}>
                <div className="translate-y-[14%]">
                  <PhoneMockup width={360} withSphere={false} float={false}>
                    <div className="relative h-full bg-[#0a0714]">
                      {STEPS.map((s, i) => <VideoLayer key={s.n} src={s.v} opacity={ops[i]} />)}
                    </div>
                  </PhoneMockup>
                </div>
                <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(97,69,194,0.4), transparent 65%)', filter: 'blur(40px)' }} />
              </div>
            </div>

            {/* крупный заголовок шага */}
            <div className="relative">
              <div className="mb-7 flex gap-2">
                {STEPS.map((s, i) => (
                  <span key={s.n} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(180,160,255,0.14)' }}>
                    <motion.span className="block h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6145c2,#d6c8ff)', transformOrigin: 'left' }} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.4 }} />
                  </span>
                ))}
              </div>
              <div className="relative min-h-[280px]">
                {STEPS.map((s, i) => (
                  <motion.div key={s.n} className="absolute inset-0 flex flex-col justify-center" style={{ opacity: ops[i] }}>
                    <span className="font-mono text-sm text-violet">{s.n} / 0{N}</span>
                    <h3 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-extralight leading-[1.04] text-fg-0">{s.t}</h3>
                    <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-2 sm:text-[17px]">{s.d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
