import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SecTag } from '../components/caseui'

function PlayOrb() {
  return (
    <div className="relative h-44 w-44 sm:h-52 sm:w-52">
      <motion.span className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 80px -4px #9a8cf0' }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity }} />
      <motion.span className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, #d6c8ff, #9a8cf0, #e6b8ff, #c2a0ff, #b8e0ff, #ffd6f0, #d6c8ff)' }} animate={{ rotate: 360 }} transition={{ duration: 10, ease: 'linear', repeat: Infinity }} />
      <motion.span className="absolute inset-0 rounded-full mix-blend-overlay" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.95) 28deg, transparent 80deg, transparent 360deg)' }} animate={{ rotate: 360 }} transition={{ duration: 3.6, ease: 'linear', repeat: Infinity }} />
      <span className="absolute inset-[7%] rounded-full" style={{ background: 'radial-gradient(circle at 50% 32%, rgba(42,32,72,0.9), rgba(12,9,24,0.96))', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 40px -10px #9a8cf0' }} />
      <span className="pointer-events-none absolute inset-[7%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28), transparent 46%)' }} />
      <span className="absolute inset-0 grid place-items-center text-white"><svg viewBox="0 0 24 24" className="h-12 w-12 translate-x-1 sm:h-16 sm:w-16" fill="currentColor" style={{ filter: 'drop-shadow(0 0 10px #d6c8ff)' }}><path d="M8 5v14l11-7z" /></svg></span>
    </div>
  )
}

function ProgressBar() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(180,160,255,0.1)' }}>
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'linear-gradient(90deg, oklch(0.6 0.18 290), oklch(0.78 0.14 310), oklch(0.85 0.12 280))', boxShadow: '0 0 16px rgba(180,160,255,0.9), 0 0 30px rgba(97,69,194,0.6)' }}
          animate={{ width: ['10%', '94%'] }} transition={{ duration: 16, ease: 'linear', repeat: Infinity }}>
          <motion.span className="absolute inset-y-0 w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }} animate={{ x: ['-64px', '420px'] }} transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }} />
        </motion.div>
      </div>
      <div className="mt-2.5 flex justify-between font-mono text-[11px] text-fg-3"><span>идёт практика</span><span>14:40</span></div>
    </div>
  )
}

export default function AudioFocus() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const orbScale = useTransform(scrollYProgress, [0, 0.6], [2.6, 1])
  const orbOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1])
  const ringScale = useTransform(scrollYProgress, [0, 0.6], [1.6, 1])
  const ringOpacity = useTransform(scrollYProgress, [0.15, 0.42], [0, 1])
  const textY = useTransform(scrollYProgress, [0.35, 0.62], [40, 0])
  const textOp = useTransform(scrollYProgress, [0.38, 0.62], [0, 1])

  return (
    <section ref={ref} id="audio" style={{ height: '180vh' }} className="relative">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-5">
        <div className="absolute left-5 top-20 sm:left-8"><SecTag num="09">Аудиоплеер · звук без отвлечений</SecTag></div>

        <motion.div className="relative flex items-center justify-center" style={{ scale: orbScale, opacity: orbOpacity }}>
          <motion.svg className="absolute h-[230px] w-[230px] sm:h-[280px] sm:w-[280px]" viewBox="0 0 200 200" style={{ scale: ringScale, rotate: -90, opacity: ringOpacity }} aria-hidden>
            <defs><linearGradient id="af-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6145c2" /><stop offset="60%" stopColor="#d6c8ff" /><stop offset="100%" stopColor="#9a8cf0" /></linearGradient></defs>
            <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(180,160,255,0.1)" strokeWidth="2" />
            <motion.circle cx="100" cy="100" r="94" fill="none" stroke="url(#af-ring)" strokeWidth="2.5" strokeLinecap="round" pathLength="1" strokeDasharray="1"
              animate={{ strokeDashoffset: [0.92, 0.08] }} transition={{ duration: 16, ease: 'linear', repeat: Infinity }} style={{ filter: 'drop-shadow(0 0 6px rgba(214,200,255,0.9))' }} />
          </motion.svg>
          <PlayOrb />
        </motion.div>

        <motion.div className="mt-12 w-full max-w-2xl text-center" style={{ opacity: textOp, y: textY }}>
          <h2 className="font-display text-[clamp(2rem,5.5vw,3.6rem)] font-extralight leading-[1.04] text-fg-0" style={{ textShadow: '0 0 48px rgba(97,69,194,0.35)' }}>
            Только <span className="font-medium text-glow-violet">play</span>.<br />
            <span className="font-medium">Без перемотки. Без паузы.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-fg-2">
            Нажал — и слушаешь до конца. Перемотки и паузы нет специально, чтобы внимание не утекало в управление. Пришёл медитировать — не отвлекайся.
          </p>
          <div className="mt-10"><ProgressBar /></div>
        </motion.div>
      </div>
    </section>
  )
}
