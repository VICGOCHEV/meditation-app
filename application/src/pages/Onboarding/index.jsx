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
  const fadeIntervalRef = useRef(null)

  // Плавное затихание + пауза. Дефолт 700мс — комфортно для голоса,
  // не выглядит как застрял баг. Возвращает Promise, который резолвится
  // когда fade закончен (можно дождаться перед setState/unmount).
  const fadeOutAndPause = (audio, durationMs = 700) =>
    new Promise((resolve) => {
      if (!audio || audio.paused) {
        resolve()
        return
      }
      // Отменяем предыдущий fade если был — иначе они подерутся за громкость
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      const startVol = audio.volume
      const steps = 24
      const stepMs = Math.max(10, durationMs / steps)
      let i = 0
      fadeIntervalRef.current = setInterval(() => {
        i += 1
        const t = i / steps
        // ease-in: тише сильнее к концу, чтобы хвост был мягкий
        audio.volume = Math.max(0, startVol * (1 - t * t))
        if (i >= steps) {
          clearInterval(fadeIntervalRef.current)
          fadeIntervalRef.current = null
          audio.pause()
          audio.volume = startVol // вернём громкость на случай нового play
          resolve()
        }
      }, stepMs)
    })

  const togglePreview = (voiceId) => {
    // Тот же голос — fade-out и стоп
    if (playingVoice === voiceId) {
      const a = audioRef.current
      audioRef.current = null
      setPlayingVoice(null)
      fadeOutAndPause(a, 600)
      return
    }
    // Иной голос — затухаем старый (не ждём), запускаем новый сразу
    if (audioRef.current) {
      const oldA = audioRef.current
      audioRef.current = null
      fadeOutAndPause(oldA, 500)
    }
    const audio = new Audio(`/onboarding-voices/${voiceId}.mp3`)
    audio.addEventListener('ended', () => setPlayingVoice(null))
    audio.addEventListener('error', () => setPlayingVoice(null))
    audio.play().catch(() => setPlayingVoice(null))
    audioRef.current = audio
    setPlayingVoice(voiceId)
  }

  // Когда уходим со step 2 (выбор голоса) — затихаем превью.
  // Клиент 01.06.2026: «если играет превью и ты перешёл на след шаг —
  // голос должен плавно затихать».
  useEffect(() => {
    if (step !== 2 && audioRef.current) {
      const a = audioRef.current
      audioRef.current = null
      setPlayingVoice(null)
      fadeOutAndPause(a, 800)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Cleanup на размонтирование (выход с страницы — тоже затихание).
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      if (audioRef.current) {
        fadeOutAndPause(audioRef.current, 400)
        audioRef.current = null
      }
    }
  }, [])

  const finish = async () => {
    if (audioRef.current) {
      const a = audioRef.current
      audioRef.current = null
      await fadeOutAndPause(a, 500)
    }
    localStorage.setItem('onboarding_completed', 'true')
    navigate('/auth/login')
  }

  // «Пропустить» — выходим полностью из онбординга (не только до последнего шага).
  // Клиент 03.06: «если жмёшь — то весь онбординг пропускаем, а не первые 3».
  const skip = () => { void finish() }

  return (
    <ScreenShell>
      <OnboardingFog />
      <div className="flex min-h-[90dvh] flex-col">
        <div className="flex items-center justify-between">
          <Dots count={5} active={step} />
          {step < 4 && (
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

          {step === 4 && (
            <div className="flex flex-col">
              <motion.div className="label-mono text-lilac/80" variants={eyebrowVar}>
                Прогресс · 05
              </motion.div>

              <h1 className="mt-5 font-serif text-[40px] leading-[1.05] tracking-tight text-fg-0">
                <motion.span className="block font-extralight" variants={lineLeft}>
                  Оцифруй
                </motion.span>
                <motion.span className="block font-medium text-fg-0" variants={lineRight}>
                  изменения.
                </motion.span>
              </h1>

              <motion.p
                className="mt-6 max-w-[34ch] text-[14px] leading-relaxed text-fg-2"
                variants={paraVar}
              >
                Свой прогресс увидишь в цифрах. Три коротких среза за курс — и наглядное «было / стало».
              </motion.p>

              {/* Три карточки-блока — не полотном, а ритмом. Клиент 03.06. */}
              <motion.div className="mt-7 flex flex-col gap-3" variants={cardItemVar}>
                {/* 1. Трекер */}
                <div
                  className="relative isolate overflow-hidden rounded-lg p-4"
                  style={{
                    boxShadow:
                      '0 0 24px -10px rgba(97,69,194,.45), inset 0 0 0 1px rgba(180,160,255,.06)',
                  }}
                >
                  <span className="liquid-card-glow" style={{ animationDuration: '16s' }} />
                  <span className="liquid-card-border" />
                  <div className="relative z-10 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                      style={{
                        border: '1.5px solid #6145c2',
                        boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="17" rx="2" strokeLinecap="round" />
                        <path d="M3 9h18M8 2v4M16 2v4M8 13h2M14 13h2M8 17h2M14 17h2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-lilac/80">
                        Трекер прослушивания
                      </div>
                      <p className="mt-1 text-[13.5px] leading-snug text-fg-1">
                        В личном кабинете развернётся трекер дней — увидишь свою последовательность практик.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Deep Analysis */}
                <div
                  className="relative isolate overflow-hidden rounded-lg p-4"
                  style={{
                    boxShadow:
                      '0 0 24px -10px rgba(97,69,194,.45), inset 0 0 0 1px rgba(180,160,255,.06)',
                  }}
                >
                  <span className="liquid-card-glow" style={{ animationDuration: '18s' }} />
                  <span className="liquid-card-border" />
                  <div className="relative z-10 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                      style={{
                        border: '1.5px solid #6145c2',
                        boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 18 0M3 12a9 9 0 0 1 18 0M12 3v18M3 12h18" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-lilac/80">
                        Глубокий анализ · 3 этапа
                      </div>
                      <p className="mt-1 text-[13.5px] leading-snug text-fg-1">
                        При переходе на «Пароль от жизни» — короткий замер на старте, после половины курса и в финале.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Сравнение */}
                <div
                  className="relative isolate overflow-hidden rounded-lg p-4"
                  style={{
                    boxShadow:
                      '0 0 24px -10px rgba(97,69,194,.45), inset 0 0 0 1px rgba(180,160,255,.06)',
                  }}
                >
                  <span className="liquid-card-glow" style={{ animationDuration: '20s' }} />
                  <span className="liquid-card-border" />
                  <div className="relative z-10 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lilac"
                      style={{
                        border: '1.5px solid #6145c2',
                        boxShadow: '0 0 12px rgba(97,69,194,.7), inset 0 0 6px rgba(97,69,194,.25)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M4 19V5M20 19V11M12 19V8" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-lilac/80">
                        Сравнение «было / стало»
                      </div>
                      <p className="mt-1 text-[13.5px] leading-snug text-fg-1">
                        В финале увидишь честные цифры — как изменилась тревожность и подросла осознанность.
                      </p>
                    </div>
                  </div>
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
              <ShinyButton fullWidth onClick={() => setStep(4)}>
                Далее
              </ShinyButton>
            )}
            {step === 4 && (
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
