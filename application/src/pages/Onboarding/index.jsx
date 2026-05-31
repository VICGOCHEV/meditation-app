import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ShinyButton from '../../components/ui/ShinyButton'
import ScreenShell from '../../components/ui/ScreenShell'
import OnboardingFog from '../../components/OnboardingFog'
import { usePlayerStore } from '../../store/usePlayerStore'

const EASE = [0.22, 0.8, 0.36, 1]

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

// Onboarding voice/music picker tile — visually identical to Home
// practice cards (liquid-glass surface + same violet play button) per
// the redesign brief, but as a horizontal row with title on the right.
// onPreview — отдельная callback для кнопки play (если передана,
// делает preview без selection); onSelect срабатывает по тапу на тело.
function ChoiceCard({ title, sub, selected, onSelect, onPreview, playing }) {
  // Random animation phase per card so neighbours breathe out of sync.
  const delay = -(Math.random() * 14).toFixed(2) + 's'
  const duration = (12 + Math.random() * 6).toFixed(2) + 's'
  const borderDelay = -(Math.random() * 5).toFixed(2) + 's'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative isolate flex w-full items-center gap-4 overflow-hidden rounded-lg p-4 text-left"
      style={{
        boxShadow: selected
          ? '0 0 36px -6px rgba(97,69,194,.85), inset 0 0 0 1px rgba(216,200,255,.45)'
          : '0 0 24px -8px rgba(97,69,194,.5), inset 0 0 0 1px rgba(180,160,255,.05)',
      }}
    >
      <span
        className="liquid-card-glow"
        style={{ animationDelay: delay, animationDuration: duration }}
      />
      <span
        className="liquid-card-border"
        style={{ animationDelay: borderDelay }}
      />
      {/* No backdrop-filter here on purpose — the SVG turbulence ghost
          reads as visible white wave artefacts on the empty surface
          around these tiles (unlike practice cards which sit on a
          denser background). */}

      {/* Same play button as Card.jsx — теперь интерактивна для preview */}
      <span
        role={onPreview ? 'button' : undefined}
        tabIndex={onPreview ? 0 : undefined}
        onClick={(e) => {
          if (!onPreview) return
          e.stopPropagation() // не триггерить onSelect
          onPreview()
        }}
        onKeyDown={(e) => {
          if (!onPreview) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onPreview()
          }
        }}
        aria-label={playing ? 'Остановить превью' : 'Слушать превью голоса'}
        className={[
          'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-lilac',
          onPreview ? 'cursor-pointer' : '',
        ].join(' ')}
        style={{
          border: '1.5px solid #6145c2',
          boxShadow:
            '0 0 18px rgba(97,69,194,.95), 0 0 36px rgba(97,69,194,.55), inset 0 0 10px rgba(97,69,194,.35)',
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>

      <div className="relative z-10 flex flex-1 flex-col">
        <span className="font-sans text-[16px] font-medium leading-tight text-fg-0">
          {title}
        </span>
        <span className="mt-1 font-mono text-[11px] uppercase tracking-[.18em] text-lilac/70">
          {sub}
        </span>
      </div>

      {selected && (
        <span
          className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'oklch(0.72 0.13 160 / .25)',
            border: '1px solid oklch(0.72 0.13 160 / .5)',
            color: 'oklch(0.85 0.13 160)',
          }}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const setVoice = usePlayerStore((s) => s.setVoice)

  // Voice preview — клиентский аудио-превью на step 2.
  // Файлы: /public/onboarding-voices/male.mp3 (Александр) и female.mp3 (Алёна).
  const [playingVoice, setPlayingVoice] = useState(null)
  const audioRef = useRef(null)

  const togglePreview = (voiceId) => {
    // Тот же голос — стоп
    if (playingVoice === voiceId) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlayingVoice(null)
      return
    }
    // Иной голос или ничего не играло — стартуем новый, останавливаем старый
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(`/onboarding-voices/${voiceId}.mp3`)
    audio.addEventListener('ended', () => setPlayingVoice(null))
    audio.addEventListener('error', () => setPlayingVoice(null))
    audio.play().catch(() => setPlayingVoice(null))
    audioRef.current = audio
    setPlayingVoice(voiceId)
  }

  // Cleanup на размонтирование / переход с onboarding
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const finish = () => {
    if (audioRef.current) audioRef.current.pause()
    localStorage.setItem('onboarding_completed', 'true')
    navigate('/auth/login')
  }

  const skip = () => setStep(3)

  return (
    <ScreenShell>
      <OnboardingFog />
      <div className="flex min-h-[90dvh] flex-col">
        <div className="flex items-center justify-between">
          <Dots count={4} active={step} />
          {step < 3 && (
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
                  к внутренней
                </motion.span>
                <motion.span className="block pl-10 font-medium text-fg-0" variants={lineDown}>
                  тишине.
                </motion.span>
              </h1>

              <motion.p
                className="mt-10 max-w-[30ch] pl-10 text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Мягкие практики расслабления и осознанности. Открывай новые уровни по мере своего роста.
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
                  Создавай
                </motion.span>
                <motion.span className="block font-medium text-fg-0" variants={lineRight}>
                  пространство
                </motion.span>
                <motion.span className="block pl-12 font-extralight text-fg-1" variants={lineDown}>
                  внутри.
                </motion.span>
              </h1>

              <motion.p
                className="mt-10 max-w-[30ch] pl-12 text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Каждые четыре дня — новая практика. Отслеживай своё состояние и двигайся к себе небольшими, осознанными шагами.
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
                  Найди
                </motion.span>
                <motion.span className="block pl-10 font-medium text-fg-0" variants={lineRight}>
                  своего
                </motion.span>
                <motion.span className="block font-extralight text-fg-1" variants={lineDown}>
                  проводника.
                </motion.span>
              </h1>

              <motion.p
                className="mt-6 max-w-[30ch] pl-10 text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Какой голос поможет тебе расслабиться и услышать себя?
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col gap-3"
                variants={cardListVar}
              >
                {[
                  { id: 'male',   label: 'Мужской' },
                  { id: 'female', label: 'Женский' },
                ].map((v) => {
                  const on = selectedVoice === v.id
                  const isPlaying = playingVoice === v.id
                  return (
                    <motion.div key={v.id} variants={cardItemVar} whileTap={{ scale: 0.985 }}>
                      <ChoiceCard
                        title={v.label}
                        sub={isPlaying ? 'Идёт превью…' : 'Прослушать'}
                        selected={on}
                        playing={isPlaying}
                        onSelect={() => setVoice(v.id)}
                        onPreview={() => togglePreview(v.id)}
                      />
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Звучание · 04
              </motion.div>

              <h1 className="mt-5 font-serif text-[40px] leading-[1.05] tracking-tight text-fg-0">
                <motion.span className="block font-extralight" variants={lineLeft}>
                  Управляй
                </motion.span>
                <motion.span className="block font-extralight text-fg-1" variants={lineRight}>
                  фоном и энергией
                </motion.span>
                <motion.span className="block pl-10 font-medium text-fg-0" variants={lineDown}>
                  звучания.
                </motion.span>
              </h1>

              {/* Информационная карточка — единственный визуальный блок этого
                  шага. Тот же liquid-glass surface, что и в практик-картах,
                  но без play-кнопки/чекбокса — это просто пояснение. */}
              <motion.div
                className="mt-10 relative isolate overflow-hidden rounded-lg p-5"
                style={{
                  boxShadow:
                    '0 0 24px -8px rgba(97,69,194,.5), inset 0 0 0 1px rgba(180,160,255,.05)',
                }}
                variants={cardItemVar}
              >
                <span className="liquid-card-glow" style={{ animationDuration: '14s' }} />
                <span className="liquid-card-border" />
                <div className="relative z-10 flex items-start gap-4">
                  {/* Иконка-индикатор «волны» */}
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-lilac"
                    style={{
                      border: '1.5px solid #6145c2',
                      boxShadow:
                        '0 0 18px rgba(97,69,194,.85), 0 0 36px rgba(97,69,194,.45), inset 0 0 10px rgba(97,69,194,.3)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M3 12h2M19 12h2M7 6v12M11 3v18M15 6v12" strokeLinecap="round" />
                    </svg>
                  </span>
                  <p className="text-[14px] leading-relaxed text-fg-1">
                    Внутри практик тебе будет доступна смена звуковых режимов.
                    Переключай энергии и настраивай фоновое звучание прямо
                    в&nbsp;плеере под свой текущий запрос.
                  </p>
                </div>
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
            {step === 0 && (
              <ShinyButton fullWidth onClick={() => setStep(1)}>
                Начать
              </ShinyButton>
            )}
            {step === 1 && (
              <ShinyButton fullWidth onClick={() => setStep(2)}>
                Далее
              </ShinyButton>
            )}
            {step === 2 && (
              <ShinyButton
                fullWidth
                disabled={!selectedVoice}
                onClick={() => setStep(3)}
              >
                Далее
              </ShinyButton>
            )}
            {step === 3 && (
              <ShinyButton fullWidth onClick={finish}>
                Начать
              </ShinyButton>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ScreenShell>
  )
}
