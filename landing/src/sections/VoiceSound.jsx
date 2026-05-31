import { useState, useRef, lazy, Suspense } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal, Eyebrow } from '../components/primitives'
import MouseFloat from '../components/MouseFloat'

// сфера — WebGL, грузим лениво (three остаётся в отдельном чанке, не в entry)
const AmorphSphere = lazy(() => import('../components/AmorphSphere'))

const VOICES = [
  { id: 'female', name: 'Женский' },
  { id: 'male', name: 'Мужской' },
]
const MUSIC = [
  { id: 'create', name: 'Созидание', accent: '#d6c8ff' },
  { id: 'clear', name: 'Очищение', accent: '#9a8cf0' },
  { id: 'life', name: 'Жизнь', accent: '#e6b8ff' },
]
const BARS = 44

function Equalizer({ accent }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: BARS }).map((_, i) => {
        const deg = (i / BARS) * 360
        const base = 14 + Math.abs(Math.sin(i * 0.7)) * 40
        return (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
            <span className="absolute left-1/2 top-[2%] w-[2.5px] -translate-x-1/2 rounded-full"
              style={{ height: base, transformOrigin: 'top center', background: `linear-gradient(${accent}, transparent)`, opacity: 0.5 + (i % 3) * 0.14, animation: `waveBar ${0.85 + (i % 7) * 0.13}s ease-in-out ${(i % 11) * 0.07}s infinite` }} />
          </div>
        )
      })}
    </div>
  )
}

export default function VoiceSound() {
  const ref = useRef(null)
  const [voice, setVoice] = useState('female')
  const [music, setMusic] = useState('clear')
  const accent = MUSIC.find((m) => m.id === music)?.accent || '#d6c8ff'
  const vName = VOICES.find((v) => v.id === voice)?.name
  const mName = MUSIC.find((m) => m.id === music)?.name

  // Прогресс входа секции: 0 — только появилась снизу, 1 — центр секции в центре экрана.
  // ВСЯ связка огонёк→вспышка→сфера привязана к нему → работает в ОБЕ стороны при скролле.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })

  // огонёк прилетает сверху к центру (продолжает полёт с прошлой секции)
  const sparkY = useTransform(scrollYProgress, [0.08, 0.5], [-340, 0])
  const sparkOpacity = useTransform(scrollYProgress, [0.08, 0.42, 0.54], [0, 1, 0])
  const sparkScale = useTransform(scrollYProgress, [0.08, 0.5, 0.58], [0.8, 1.15, 2.6])
  // яркая вспышка в точке прибытия
  const flashScale = useTransform(scrollYProgress, [0.46, 0.64], [0.3, 9])
  const flashOpacity = useTransform(scrollYProgress, [0.46, 0.53, 0.66], [0, 1, 0])
  // СВЕЧЕНИЕ, которое огонёк «зажигает» на этой секции (гаснет обратно при скролле вверх)
  const igniteOpacity = useTransform(scrollYProgress, [0.42, 0.6, 1], [0, 0.75, 0.6])
  const igniteScale = useTransform(scrollYProgress, [0.42, 0.7], [0.3, 1])
  // сфера-сцена вырастает из вспышки
  const stageScale = useTransform(scrollYProgress, [0.54, 0.84], [0, 1])
  const stageOpacity = useTransform(scrollYProgress, [0.54, 0.68], [0, 1])

  return (
    <section ref={ref} id="voice" className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <MouseFloat strength={10}>
        <Reveal className="text-center">
          <Eyebrow className="mb-3">Голос и звучание</Eyebrow>
          <h2 className="font-display text-[2.2rem] font-extralight leading-[1.05] sm:text-5xl">
            Звук, который тебя ведёт<span className="text-violet">.</span>
          </h2>
        </Reveal>
      </MouseFloat>

      {/* центральная сцена — огонёк прилетает → вспышка → из неё растёт сфера (поднята выше) */}
      <div className="relative mb-10 grid place-items-center">
        {/* свечение, зажжённое огоньком (за сценой) */}
        <motion.div
          className="pointer-events-none absolute h-[120%] w-[120%] rounded-full"
          style={{ opacity: igniteOpacity, scale: igniteScale, background: `radial-gradient(circle, ${accent}55, ${accent}22 35%, transparent 65%)`, filter: 'blur(20px)' }}
        />
        {/* огонёк влетает сверху и приходит в центр */}
        <motion.span
          className="absolute z-20 h-4 w-4 rounded-full"
          style={{ y: sparkY, opacity: sparkOpacity, scale: sparkScale, background: 'radial-gradient(circle,#fff,#ffe6b3 40%,#d6c8ff 72%,transparent)', boxShadow: '0 0 26px 8px rgba(255,224,160,0.7), 0 0 60px 18px rgba(97,69,194,0.55)' }}
        />
        {/* вспышка в точке прибытия */}
        <motion.span
          className="absolute z-10 h-8 w-8 rounded-full"
          style={{ scale: flashScale, opacity: flashOpacity, background: 'radial-gradient(circle,#fff,#ffe6b3 35%,transparent 70%)' }}
        />

        {/* сцена со сферой — растёт из точки прибытия огонька */}
        <motion.div
          className="relative"
          style={{ width: 'min(84vw, 460px)', aspectRatio: '1/1', scale: stageScale, opacity: stageOpacity }}
        >
          {/* дымчатая подложка — сфера вписана мягко, аморфно */}
          <div className="pointer-events-none absolute inset-[2%] rounded-full mix-blend-screen" style={{ background: `radial-gradient(circle at 50% 47%, ${accent}66, ${accent}22 45%, transparent 70%)`, filter: 'blur(24px)' }} />

          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute inset-[12%] rounded-full border" style={{ borderColor: accent }}
              animate={{ scale: [1, 1.5], opacity: [0.4, 0] }} transition={{ duration: 3.6, ease: 'easeOut', delay: i * 1.2, repeat: Infinity }} />
          ))}
          <Equalizer accent={accent} />

          {/* БОЛЬШАЯ аморфная сфера — screen-бленд сразу (и в fallback), по центру PLAY */}
          <div className="absolute inset-[5%]">
            <Suspense fallback={<div className="h-full w-full rounded-full mix-blend-screen" style={{ background: `radial-gradient(circle at 50% 46%, #fff, ${accent} 30%, #6145c2 62%, transparent 78%)`, filter: 'blur(6px)' }} />}>
              <AmorphSphere size={500} blend="screen" />
            </Suspense>
          </div>

          {/* искра бежит по контуру (как везде у нас) */}
          <motion.div className="pointer-events-none absolute inset-0 z-10" animate={{ rotate: 360 }} transition={{ duration: 7, ease: 'linear', repeat: Infinity }}>
            <span className="absolute left-1/2 top-[5%] h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle,#fff,#ffe6b3 40%,#d6c8ff 72%,transparent)', boxShadow: '0 0 14px 4px rgba(255,224,160,0.85), 0 0 32px 10px rgba(97,69,194,0.5)' }} />
          </motion.div>

          {/* PLAY — крупнее и наряднее */}
          <button data-hover className="group absolute left-1/2 top-1/2 z-20 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform hover:scale-105">
            <motion.span className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${accent}`, boxShadow: `0 0 50px -6px ${accent}` }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.4, 0.9] }} transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }} />
            <span className="absolute inset-[12%] rounded-full" style={{ background: 'rgba(18,14,38,0.55)', border: `1px solid ${accent}55`, backdropFilter: 'blur(8px)', boxShadow: `inset 0 0 24px -8px ${accent}` }} />
            <svg className="relative translate-x-[2px]" width="34" height="34" viewBox="0 0 24 24" fill={accent} style={{ filter: `drop-shadow(0 0 6px ${accent})` }}><path d="M8 5v14l11-7z" /></svg>
          </button>
        </motion.div>
      </div>

      {/* управление — компактно, в один экран, с лёгкой привязкой к мыши */}
      <MouseFloat strength={7} className="w-full max-w-xl">
        <Reveal delay={0.1}>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex rounded-full border border-line p-1" style={{ background: 'rgba(20,16,42,0.4)' }}>
                {VOICES.map((v) => {
                  const on = voice === v.id
                  return (
                    <button key={v.id} onClick={() => setVoice(v.id)} data-hover className="relative rounded-full px-5 py-2 text-sm transition-colors" style={{ color: on ? '#0a0714' : '#a99ecb' }}>
                      {on && <motion.span layoutId="voicePill" className="absolute inset-0 rounded-full" style={{ background: accent, boxShadow: `0 0 24px -4px ${accent}` }} />}
                      <span className="relative font-medium">{v.name}</span>
                    </button>
                  )
                })}
              </div>
              {MUSIC.map((m) => {
                const on = music === m.id
                return (
                  <button key={m.id} onClick={() => setMusic(m.id)} data-hover className="rounded-full border px-4 py-2 text-sm transition-all"
                    style={{ borderColor: on ? m.accent : 'rgba(180,160,255,0.16)', color: on ? '#f4f0ff' : '#a99ecb', background: on ? `${m.accent}1f` : 'transparent', boxShadow: on ? `0 0 22px -8px ${m.accent}` : 'none' }}>
                    {m.name}
                  </button>
                )
              })}
            </div>
            <motion.p key={`${voice}-${music}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mono text-xs uppercase tracking-[0.18em] text-fg-3">
              {vName} <span className="text-fg-4">+</span> <span style={{ color: accent }}>{mName}</span>
            </motion.p>
          </div>
        </Reveal>
      </MouseFloat>
    </section>
  )
}
