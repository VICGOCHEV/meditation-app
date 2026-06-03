import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import LinearSlider from '../../components/ui/LinearSlider'
import ScreenShell from '../../components/ui/ScreenShell'
import { useCheckinStore } from '../../store/useCheckinStore'
import { interpretIS } from '../../utils/scoreCalc'

const EASE = [0.22, 0.8, 0.36, 1]
const stepVariants = {
  forward: {
    initial: { opacity: 0, x: 48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -48 },
  },
  backward: {
    initial: { opacity: 0, x: -48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 48 },
  },
}

// Pictogram per IS state — rendered as a glowing inline SVG so we
// reuse the violet halo treatment from the rest of the app instead of
// emoji.
function StateIcon({ state, size = 96 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (state === 'Шторм') {
    return (
      <svg {...common}>
        <path d="M14 30c-3 0-6-2-6-6s2-7 7-7c1-5 6-9 12-9 7 0 12 5 12 11 4 0 8 4 8 8s-3 7-8 7H14z" fill="rgba(216,200,255,.10)" />
        <path d="M22 42l-5 12M32 42l-3 8M42 42l-5 12" stroke="#d8c8ff" strokeWidth={1.7} />
      </svg>
    )
  }
  if (state === 'Ясность') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="10" fill="rgba(216,200,255,.18)" />
        <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M14 50l6-6M44 20l6-6" stroke="#d8c8ff" />
      </svg>
    )
  }
  if (state === 'Поток') {
    return (
      <svg {...common}>
        <path d="M8 34c8-8 16-8 24 0s16 8 24 0M8 22c8-8 16-8 24 0s16 8 24 0M8 46c8-8 16-8 24 0s16 8 24 0" />
      </svg>
    )
  }
  // Туман — default
  return (
    <svg {...common}>
      <path
        d="M18 38c-5 0-9-3-9-8s4-8 9-8c0-5 5-10 11-10 7 0 11 5 12 11 5 0 9 3 9 8s-4 7-9 7H18z"
        fill="rgba(216,200,255,.18)"
      />
    </svg>
  )
}

const STATE_NAMES = ['Шторм', 'Туман', 'Ясность', 'Поток']
const CYCLE_STEP_MS = 460
const CYCLE_TOTAL_MS = 2400

function ResultScreen({ result, onContinue }) {
  const [phase, setPhase] = useState('cycling')
  const [tickIdx, setTickIdx] = useState(0)

  useEffect(() => {
    if (phase !== 'cycling') return
    const interval = setInterval(() => setTickIdx((i) => i + 1), CYCLE_STEP_MS)
    const settle = setTimeout(() => {
      clearInterval(interval)
      setPhase('settled')
    }, CYCLE_TOTAL_MS)
    return () => {
      clearInterval(interval)
      clearTimeout(settle)
    }
  }, [phase])

  const displayed =
    phase === 'cycling' ? STATE_NAMES[tickIdx % STATE_NAMES.length] : result.state

  return (
    <ScreenShell>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
        {/* Top pill chip — «ИНДЕКС СОСТОЯНИЯ · 20/40» */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: phase === 'settled' ? 1 : 0.55,
            y: 0,
          }}
          transition={{ duration: 0.7, ease: EASE, delay: phase === 'settled' ? 0.1 : 0 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'rgba(97,69,194,.15)',
            border: '1px solid rgba(180,160,255,.28)',
            boxShadow:
              '0 0 18px -4px rgba(97,69,194,.55), inset 0 0 14px rgba(97,69,194,.18)',
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: '#d8c8ff', boxShadow: '0 0 8px #6145c2' }}
          />
          <span className="font-mono text-[11px] uppercase tracking-[.18em] text-lilac">
            Индекс состояния · {result.IS}/40
          </span>
        </motion.div>

        {/* Giant title (cycles through state names, then settles) */}
        <div className="relative mt-8 h-[80px] w-full overflow-hidden">
          <AnimatePresence>
            <motion.h1
              key={displayed + (phase === 'cycling' ? `-${tickIdx}` : '-final')}
              className="absolute inset-0 flex items-center justify-center font-serif text-[64px] font-light leading-none text-fg-0"
              initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(10px)' }}
              transition={
                phase === 'settled'
                  ? { duration: 1.1, ease: EASE }
                  : { duration: 0.42, ease: EASE }
              }
            >
              {displayed}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Glowing icon below the title — initial highlight pulse, then
            steady breathing glow forever (CSS keyframe chain). */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'settled' ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: phase === 'settled' ? 0.25 : 0 }}
          className="mt-8 text-lilac"
        >
          <div
            key={phase === 'settled' ? 'live' : 'pre'}
            className={phase === 'settled' ? 'state-icon-reveal' : ''}
          >
            <StateIcon state={result.state} />
          </div>
        </motion.div>

        <motion.p
          className="mt-10 max-w-sm text-[15px] leading-relaxed text-fg-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: phase === 'settled' ? 1 : 0,
            y: phase === 'settled' ? 0 : 12,
          }}
          transition={{ duration: 0.9, ease: EASE, delay: phase === 'settled' ? 0.55 : 0 }}
        >
          {result.text}
        </motion.p>

        <motion.div
          className="mt-10 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: phase === 'settled' ? 1 : 0,
            y: phase === 'settled' ? 0 : 16,
          }}
          transition={{ duration: 0.8, ease: EASE, delay: phase === 'settled' ? 0.85 : 0 }}
        >
          <Button size="lg" fullWidth onClick={onContinue}>
            Начать практику
          </Button>
        </motion.div>
      </div>
    </ScreenShell>
  )
}

const QUESTIONS = [
  {
    title: 'Прошлое',
    question: 'Насколько сильно мысли о прошлом (сожаления, воспоминания) отвлекают тебя сейчас?',
  },
  {
    title: 'Будущее',
    question: 'Как часто ты ловишь себя на тревожном планировании или ожидании будущего?',
  },
  {
    title: 'Беспокойство',
    question: 'Оцени свой текущий уровень фонового беспокойства.',
  },
  {
    title: 'Тело',
    question: 'Чувствуешь ли ты физическое напряжение в плечах, лице или животе?',
  },
]

function Progress({ step, total }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            'h-1 flex-1 rounded-full transition',
            i < step ? 'bg-lilac' : 'bg-white/10',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export default function Checkin() {
  const navigate = useNavigate()
  const completeCheckin = useCheckinStore((s) => s.completeCheckin)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([5, 5, 5, 5])
  const [result, setResult] = useState(null)
  const prevStepRef = useRef(0)
  const direction = step >= prevStepRef.current ? 'forward' : 'backward'
  prevStepRef.current = step

  useEffect(() => {
    if (useCheckinStore.getState().todayCheckinDone) {
      navigate('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setAnswer = (v) => {
    const next = answers.slice()
    next[step] = v
    setAnswers(next)
  }

  const onNext = async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    const [q1, q2, q3, q4] = answers
    // completeCheckin computes IS locally and (in real-backend mode)
    // POSTs to /api/checkin internally — no separate postCheckin call.
    const IS = await completeCheckin({ q1, q2, q3, q4 })
    setResult({ IS, ...interpretIS(IS) })
  }

  if (result) return <ResultScreen result={result} onContinue={() => navigate('/')} />

  const q = QUESTIONS[step]

  return (
    <ScreenShell fixed>
      <div className="flex h-full flex-col">
        <Progress step={step + 1} total={4} />

        <div className="relative mt-6 min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              initial={stepVariants[direction].initial}
              animate={stepVariants[direction].animate}
              exit={stepVariants[direction].exit}
              transition={{ duration: 0.65, ease: EASE }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="font-mono text-[11px] uppercase tracking-[.22em] text-lilac">
                {q.title}
              </div>
              <h1 className="mt-3 font-serif text-[26px] leading-tight text-fg-0">
                {q.question}
              </h1>
              {step === 0 && (
                <p className="mt-2 text-[14px] text-fg-2">Займёт меньше минуты</p>
              )}

              {/* Dial fills the remaining vertical space and is locked
                  to the centre regardless of how the question text
                  wraps above it. */}
              <div className="flex flex-1 items-center justify-center">
                <LinearSlider value={answers[step]} onChange={setAnswer} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Назад
            </Button>
          )}
          <Button fullWidth size="lg" onClick={onNext}>
            {step === 3 ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </ScreenShell>
  )
}
