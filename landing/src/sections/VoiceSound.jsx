import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal, Eyebrow } from '../components/primitives'
import MouseFloat from '../components/MouseFloat'

const B = import.meta.env.BASE_URL
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

function Equalizer({ accent, active }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: BARS }).map((_, i) => {
        const deg = (i / BARS) * 360
        const base = 14 + Math.abs(Math.sin(i * 0.7)) * 40
        return (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
            <span className="absolute left-1/2 top-[2%] w-[2.5px] -translate-x-1/2 rounded-full"
              style={{ height: base, transformOrigin: 'top center', background: `linear-gradient(${accent}, transparent)`, opacity: active ? 0.5 + (i % 3) * 0.14 : 0.22, animation: `waveBar ${0.85 + (i % 7) * 0.13}s ease-in-out ${(i % 11) * 0.07}s infinite`, animationPlayState: active ? 'running' : 'paused' }} />
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
  const [playing, setPlaying] = useState(false)
  const accent = MUSIC.find((m) => m.id === music)?.accent || '#d6c8ff'
  const vName = VOICES.find((v) => v.id === voice)?.name
  const mName = MUSIC.find((m) => m.id === music)?.name

  // превью-звук: голос (выбранный) + музыкальная подложка (тише, в петле)
  const voiceAudio = useRef(null)
  const musicAudio = useRef(null)
  const ensure = () => {
    if (!voiceAudio.current) {
      const v = new Audio(); v.preload = 'none'
      v.addEventListener('ended', () => setPlaying(false))
      voiceAudio.current = v
    }
    if (!musicAudio.current) {
      const m = new Audio(); m.preload = 'none'; m.loop = true; m.volume = 0.32
      musicAudio.current = m
    }
  }
  const voiceSrc = `${B}media/audio/voice-${voice}.mp3`
  const musicSrc = `${B}media/audio/music-${music}.mp3`

  const toggle = () => {
    ensure()
    if (playing) {
      voiceAudio.current.pause(); musicAudio.current.pause()
      setPlaying(false)
    } else {
      voiceAudio.current.src = voiceSrc; voiceAudio.current.currentTime = 0
      musicAudio.current.src = musicSrc
      voiceAudio.current.play().catch(() => {}); musicAudio.current.play().catch(() => {})
      setPlaying(true)
    }
  }
  // живая смена слоёв при выборе во время проигрывания
  useEffect(() => {
    if (!playing || !voiceAudio.current) return
    voiceAudio.current.src = voiceSrc; voiceAudio.current.currentTime = 0
    voiceAudio.current.play().catch(() => {})
  }, [voice]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing || !musicAudio.current) return
    musicAudio.current.src = musicSrc; musicAudio.current.play().catch(() => {})
  }, [music]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { voiceAudio.current?.pause(); musicAudio.current?.pause() }, [])

  // scroll-driven связка огонёк → вспышка → расцветание (реверс в обе стороны)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const sparkY = useTransform(scrollYProgress, [0.08, 0.5], [-340, 0])
  const sparkOpacity = useTransform(scrollYProgress, [0.08, 0.42, 0.54], [0, 1, 0])
  const sparkScale = useTransform(scrollYProgress, [0.08, 0.5, 0.58], [0.8, 1.15, 2.6])
  const flashScale = useTransform(scrollYProgress, [0.46, 0.64], [0.3, 9])
  const flashOpacity = useTransform(scrollYProgress, [0.46, 0.53, 0.66], [0, 1, 0])
  const igniteOpacity = useTransform(scrollYProgress, [0.42, 0.6, 1], [0, 0.75, 0.6])
  const igniteScale = useTransform(scrollYProgress, [0.42, 0.7], [0.3, 1])
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

      {/* центральная сцена — огонёк прилетает → вспышка → расцветает орб */}
      <div className="relative mb-10 grid place-items-center">
        <motion.div
          className="pointer-events-none absolute h-[120%] w-[120%] rounded-full"
          style={{ opacity: igniteOpacity, scale: igniteScale, background: `radial-gradient(circle, ${accent}55, ${accent}22 35%, transparent 65%)`, filter: 'blur(20px)' }}
        />
        <motion.span
          className="absolute z-20 h-4 w-4 rounded-full"
          style={{ y: sparkY, opacity: sparkOpacity, scale: sparkScale, background: 'radial-gradient(circle,#fff,#ffe6b3 40%,#d6c8ff 72%,transparent)', boxShadow: '0 0 26px 8px rgba(255,224,160,0.7), 0 0 60px 18px rgba(97,69,194,0.55)' }}
        />
        <motion.span
          className="absolute z-10 h-8 w-8 rounded-full"
          style={{ scale: flashScale, opacity: flashOpacity, background: 'radial-gradient(circle,#fff,#ffe6b3 35%,transparent 70%)' }}
        />

        <motion.div
          className="relative"
          style={{ width: 'min(84vw, 460px)', aspectRatio: '1/1', scale: stageScale, opacity: stageOpacity }}
        >
          {/* светящаяся сфера убрана полностью — в центре только переливающийся PLAY */}
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute inset-[12%] rounded-full border" style={{ borderColor: accent }}
              animate={{ scale: [1, 1.5], opacity: [0.4, 0] }} transition={{ duration: 3.6, ease: 'easeOut', delay: i * 1.2, repeat: Infinity }} />
          ))}
          <Equalizer accent={accent} active={playing} />

          {/* искра бежит по контуру */}
          <motion.div className="pointer-events-none absolute inset-0 z-10" animate={{ rotate: 360 }} transition={{ duration: 7, ease: 'linear', repeat: Infinity }}>
            <span className="absolute left-1/2 top-[5%] h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle,#fff,#ffe6b3 40%,#d6c8ff 72%,transparent)', boxShadow: '0 0 14px 4px rgba(255,224,160,0.85), 0 0 32px 10px rgba(97,69,194,0.5)' }} />
          </motion.div>

          {/* PLAY / PAUSE — крупная, переливающаяся с бликами */}
          <button onClick={toggle} data-hover aria-label={playing ? 'Пауза' : 'Слушать превью'}
            className="group absolute left-1/2 top-1/2 z-20 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform hover:scale-105">
            {/* пульсирующее свечение */}
            <motion.span className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 70px -4px ${accent}` }}
              animate={{ opacity: playing ? [0.7, 1, 0.7] : [0.5, 0.8, 0.5] }} transition={{ duration: playing ? 1.6 : 2.8, ease: 'easeInOut', repeat: Infinity }} />
            {/* переливающийся ободок (iridescent), медленно вращается */}
            <motion.span className="absolute inset-0 rounded-full"
              style={{ background: 'conic-gradient(from 0deg, #d6c8ff, #9a8cf0, #e6b8ff, #c2a0ff, #b8e0ff, #ffd6f0, #d6c8ff)' }}
              animate={{ rotate: 360 }} transition={{ duration: 9, ease: 'linear', repeat: Infinity }} />
            {/* бегущий блик по ободку */}
            <motion.span className="absolute inset-0 rounded-full mix-blend-overlay"
              style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.95) 28deg, transparent 80deg, transparent 360deg)' }}
              animate={{ rotate: 360 }} transition={{ duration: 3.4, ease: 'linear', repeat: Infinity }} />
            {/* тёмное стекло-сердцевина — оставляет тонкий переливающийся кант */}
            <span className="absolute inset-[8%] rounded-full" style={{ background: 'radial-gradient(circle at 50% 32%, rgba(42,32,72,0.85), rgba(12,9,24,0.94))', backdropFilter: 'blur(8px)', boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 34px -10px ${accent}` }} />
            {/* верхний глянцевый блик стекла */}
            <span className="pointer-events-none absolute inset-[8%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28), transparent 46%)' }} />
            {playing ? (
              <svg className="relative z-10" width="38" height="38" viewBox="0 0 24 24" fill="#fff" style={{ filter: `drop-shadow(0 0 8px ${accent})` }}><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
            ) : (
              <svg className="relative z-10 translate-x-[3px]" width="44" height="44" viewBox="0 0 24 24" fill="#fff" style={{ filter: `drop-shadow(0 0 8px ${accent})` }}><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
        </motion.div>
      </div>

      {/* управление */}
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
              {playing ? '▶ ' : ''}{vName} <span className="text-fg-4">+</span> <span style={{ color: accent }}>{mName}</span>
            </motion.p>
          </div>
        </Reveal>
      </MouseFloat>
    </section>
  )
}
