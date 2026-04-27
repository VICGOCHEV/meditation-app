import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import ScreenShell from '../../components/ui/ScreenShell'
import OnboardingFog from '../../components/OnboardingFog'
import { usePlayerStore } from '../../store/usePlayerStore'

const EASE = [0.22, 0.8, 0.36, 1]

const MUSIC = [
  { id: 1, title: 'Спокойствие' },
  { id: 2, title: 'Природа' },
  { id: 3, title: 'Космос' },
]

// Variants — parent drives children entry via staggerChildren, robust to
// StrictMode double-mount and any nesting edge-cases.
const slideVar = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.30, delayChildren: 0.20 } },
  exit: { opacity: 0, y: -24, filter: 'blur(8px)', transition: { duration: 0.6, ease: EASE } },
}
const eyebrowVar = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: EASE } },
}
const lineLeft = {
  hidden: { opacity: 0, x: -12, filter: 'blur(10px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 1.4, ease: EASE } },
}
const lineRight = {
  hidden: { opacity: 0, x: 12, filter: 'blur(10px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 1.4, ease: EASE } },
}
const lineDown = {
  hidden: { opacity: 0, y: 18, filter: 'blur(12px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.6, ease: EASE } },
}
const paraVar = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.6, ease: EASE } },
}
const cardListVar = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16 } },
}
const cardItemVar = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE } },
}

function Dots({ count, active }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={[
            'h-1.5 rounded-full transition-all',
            i === active ? 'w-6 bg-lilac' : 'w-1.5 bg-white/20',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function PlayCircle({ size = 56 }) {
  return (
    <span
      className="flex items-center justify-center rounded-full text-white shadow-glow transition group-hover:brightness-110"
      style={{
        width: size,
        height: size,
        background:
          'linear-gradient(180deg, oklch(0.66 0.19 300), oklch(0.50 0.22 285))',
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-[1px]" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  )
}

function CheckBadge() {
  return (
    <span
      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"
      style={{
        background: 'oklch(0.72 0.13 160 / 0.25)',
        border: '1px solid oklch(0.72 0.13 160 / 0.5)',
        color: 'oklch(0.85 0.13 160)',
      }}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12l4 4L19 7" />
      </svg>
    </span>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const selectedMusic = usePlayerStore((s) => s.selectedMusic)
  const setVoice = usePlayerStore((s) => s.setVoice)
  const setMusic = usePlayerStore((s) => s.setMusic)

  const finish = () => {
    localStorage.setItem('onboarding_completed', 'true')
    navigate('/auth/login')
  }

  const skip = () => setStep(2)

  return (
    <ScreenShell>
      <OnboardingFog />
      <div className="flex min-h-[90dvh] flex-col">
        <div className="flex items-center justify-between">
          <Dots count={4} active={step} />
          {step < 2 && (
            <button
              type="button"
              onClick={skip}
              className="text-[12px] text-fg-3 hover:text-fg-1"
            >
              Пропустить
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="mt-8 flex-1"
          variants={slideVar}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {step === 0 && (
            <div className="flex min-h-[60dvh] flex-col justify-center">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Пролог · 01
              </motion.div>

              <h1 className="mt-5 font-serif text-[44px] leading-[1.02] tracking-tight text-fg-0">
                <motion.span className="block font-extralight" variants={lineLeft}>
                  Твой путь
                </motion.span>
                <motion.span className="block font-extralight text-fg-1" variants={lineRight}>
                  к внутреннему
                </motion.span>
                <motion.span className="block pl-10 font-medium text-fg-0" variants={lineDown}>
                  покою.
                </motion.span>
              </h1>

              <motion.p
                className="mt-10 max-w-[28ch] pl-10 text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Расслабление и осознанность с системой прогрессии — новые практики открываются по мере твоего роста.
              </motion.p>
            </div>
          )}

          {step === 1 && (
            <div className="flex min-h-[60dvh] flex-col justify-center">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Система · 02
              </motion.div>

              <h1 className="mt-5 font-serif text-[44px] leading-[1.02] tracking-tight text-fg-0">
                <motion.span className="block font-extralight text-fg-1" variants={lineLeft}>
                  Каждые
                </motion.span>
                <motion.span className="block font-medium text-fg-0" variants={lineRight}>
                  три дня —
                </motion.span>
                <motion.span className="block pl-12 font-extralight text-fg-1" variants={lineDown}>
                  новая практика.
                </motion.span>
              </h1>

              <motion.p
                className="mt-10 max-w-[28ch] pl-12 text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Проходи анализ состояния, отслеживай прогресс — путь складывается из небольших осознанных шагов.
              </motion.p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Голос · 03
              </motion.div>

              <h1 className="mt-5 font-serif text-[44px] leading-[1.02] tracking-tight text-fg-0">
                <motion.span className="block font-extralight" variants={lineLeft}>
                  Выбери
                </motion.span>
                <motion.span className="block pl-10 font-medium text-fg-0" variants={lineRight}>
                  голос
                </motion.span>
                <motion.span className="block font-extralight text-fg-1" variants={lineDown}>
                  проводника.
                </motion.span>
              </h1>

              <motion.div
                className="mt-10 grid grid-cols-2 gap-3"
                variants={cardListVar}
              >
                {[
                  { id: 'male', label: 'Мужской' },
                  { id: 'female', label: 'Женский' },
                ].map((v) => {
                  const on = selectedVoice === v.id
                  return (
                    <motion.button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      variants={cardItemVar}
                      whileTap={{ scale: 0.97 }}
                      className={[
                        'group relative flex flex-col items-center gap-4 rounded-lg border px-4 py-7 text-center transition',
                        on
                          ? 'border-lilac bg-white/10'
                          : 'border-line-2 bg-white/[0.04] hover:bg-white/[0.08]',
                      ].join(' ')}
                    >
                      {on && <CheckBadge />}
                      <PlayCircle size={64} />
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-medium text-fg-0">Прослушать</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
                          {v.label}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Музыка · 04
              </motion.div>

              <h1 className="mt-5 font-serif text-[44px] leading-[1.02] tracking-tight text-fg-0">
                <motion.span className="block font-extralight" variants={lineLeft}>
                  Выбери
                </motion.span>
                <motion.span className="block pl-12 font-medium text-fg-0" variants={lineRight}>
                  фон
                </motion.span>
                <motion.span className="block font-extralight text-fg-1" variants={lineDown}>
                  звучания.
                </motion.span>
              </h1>

              <motion.div
                className="mt-10 flex flex-col gap-3"
                variants={cardListVar}
              >
                {MUSIC.map((m) => {
                  const on = selectedMusic === m.id
                  return (
                    <motion.button
                      key={m.id}
                      type="button"
                      onClick={() => setMusic(m.id)}
                      variants={cardItemVar}
                      whileTap={{ scale: 0.98 }}
                      className={[
                        'group relative flex items-center gap-4 rounded-lg border px-4 py-3.5 text-left transition',
                        on
                          ? 'border-lilac bg-white/10'
                          : 'border-line-2 bg-white/[0.04] hover:bg-white/[0.08]',
                      ].join(' ')}
                    >
                      <PlayCircle size={48} />
                      <div className="flex flex-1 flex-col">
                        <span className="text-[15px] font-medium text-fg-0">Прослушать</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-3">
                          {m.title}
                        </span>
                      </div>
                      {on && (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{
                            background: 'oklch(0.72 0.13 160 / 0.25)',
                            border: '1px solid oklch(0.72 0.13 160 / 0.5)',
                            color: 'oklch(0.85 0.13 160)',
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 12l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          )}
        </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`btn-${step}`}
            className="mt-8 flex flex-col gap-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.7, ease: EASE, delay: 2.4 },
            }}
            exit={{
              opacity: 0,
              y: -8,
              transition: { duration: 0.35, ease: EASE },
            }}
          >
            {step < 2 && (
              <Button size="lg" fullWidth onClick={() => setStep(step + 1)}>
                Далее
              </Button>
            )}
            {step === 2 && (
              <Button
                size="lg"
                fullWidth
                disabled={!selectedVoice}
                onClick={() => setStep(3)}
              >
                Далее
              </Button>
            )}
            {step === 3 && (
              <Button
                size="lg"
                fullWidth
                disabled={!selectedMusic}
                onClick={finish}
              >
                Начать
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ScreenShell>
  )
}
