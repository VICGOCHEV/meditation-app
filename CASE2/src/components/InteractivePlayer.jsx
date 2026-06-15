import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AmorphSphere from './AmorphSphere'
import Icon from '../lib/icons'

const VOICES = [
  { id: 'female', label: 'Женский', src: '/voice/female.mp3' },
  { id: 'male', label: 'Мужской', src: '/voice/male.mp3' },
]

function fmt(s) {
  if (!Number.isFinite(s)) return '00:00'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// Настоящий мини-плеер: аморфная сфера из аппки + реальное голос-аудио
// (onboarding-voices male/female.mp3). Можно нажать play и послушать.
export default function InteractivePlayer({ size = 300 }) {
  const audioRef = useRef(null)
  const [voice, setVoice] = useState('female')
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCur(a.currentTime)
    const onMeta = () => setDur(a.duration)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const pickVoice = (id) => {
    if (id === voice) return
    const a = audioRef.current
    const wasPlaying = playing
    setVoice(id)
    setCur(0)
    if (a) {
      a.src = VOICES.find((v) => v.id === id).src
      a.currentTime = 0
      if (wasPlaying) a.play().catch(() => setPlaying(false))
    }
  }

  const seek = (e) => {
    const a = audioRef.current
    if (!a || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    const p = (e.clientX - r.left) / r.width
    a.currentTime = p * dur
    setCur(a.currentTime)
  }

  const pct = dur ? (cur / dur) * 100 : 0

  return (
    <div className="case-card relative flex flex-col items-center overflow-hidden p-8 sm:p-10">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 25%, rgba(60,40,130,0.5), transparent 70%)' }} />
      <audio ref={audioRef} src={VOICES[0].src} preload="metadata" />

      <span className="relative label-mono self-start">Живой плеер · реальный голос приложения</span>

      <motion.div className="relative my-6" animate={{ scale: playing ? 1.06 : 1 }} transition={{ duration: 0.8, ease: [0.22, 0.9, 0.3, 1] }}>
        <AmorphSphere size={size} />
      </motion.div>

      {/* прогресс */}
      <div className="relative w-full">
        <div className="h-1.5 w-full cursor-pointer rounded-full" style={{ background: 'rgba(180,160,255,0.14)' }} onClick={seek}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6145c2,#d6c8ff)' }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-3">
          <span>{fmt(cur)}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>

      {/* управление */}
      <div className="relative mt-5 flex w-full items-center justify-between">
        {/* переключатель голоса */}
        <div className="flex rounded-full p-1" style={{ background: 'rgba(20,16,42,0.7)', border: '1px solid rgba(180,160,255,0.14)' }}>
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => pickVoice(v.id)}
              className="rounded-full px-3.5 py-1.5 text-[12px] transition-colors"
              style={voice === v.id ? { background: 'rgba(97,69,194,0.3)', color: '#f4f0ff' } : { color: '#a99ecb' }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button onClick={toggle} className="flex h-14 w-14 items-center justify-center rounded-full btn-primary-app" aria-label={playing ? 'Пауза' : 'Слушать'}>
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><rect x="7" y="6" width="3.4" height="12" rx="1" /><rect x="13.6" y="6" width="3.4" height="12" rx="1" /></svg>
          ) : (
            <Icon name="play" size={26} className="text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
