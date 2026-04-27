import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import Slider from '../../components/ui/Slider'
import ScreenShell from '../../components/ui/ScreenShell'
import { useCheckinStore } from '../../store/useCheckinStore'
import { interpretIS } from '../../utils/scoreCalc'
import { postCheckin } from '../../api/checkin'

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
        <motion.div
          className="label-mono mb-3 text-lilac"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: phase === 'settled' ? 1 : 0.4, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: phase === 'settled' ? 0.1 : 0 }}
        >
          Индекс состояния · {result.IS}/40
        </motion.div>

        <div className="relative h-[72px] w-full overflow-hidden">
          <AnimatePresence>
            <motion.h1
              key={displayed + (phase === 'cycling' ? `-${tickIdx}` : '-final')}
              className="absolute inset-0 flex items-center justify-center font-serif text-[52px] font-light leading-none text-fg-0"
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

        <motion.p
          className="mt-8 max-w-sm text-[15px] leading-relaxed text-fg-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase === 'settled' ? 1 : 0, y: phase === 'settled' ? 0 : 12 }}
          transition={{ duration: 0.9, ease: EASE, delay: phase === 'settled' ? 0.4 : 0 }}
        >
          {result.text}
        </motion.p>

        <motion.div
          className="mt-10 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase === 'settled' ? 1 : 0, y: phase === 'settled' ? 0 : 16 }}
          transition={{ duration: 0.8, ease: EASE, delay: phase === 'settled' ? 0.7 : 0 }}
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
    question: 'Насколько сильно мысли о прошлом отвлекают тебя сейчас?',
    left: '0 — совсем нет',
    right: '10 — постоянно там',
  },
  {
    title: 'Будущее',
    question: 'Как часто ты ловишь себя на тревожном планировании?',
    left: '0 — живу моментом',
    right: '10 — живу в «завтра»',
  },
  {
    title: 'Беспокойство',
    question: 'Оцени свой текущий уровень фонового беспокойства',
    left: '0 — абсолютное спокойствие',
    right: '10 — сильная тревога',
  },
  {
    title: 'Тело',
    question: 'Чувствуешь ли ты физическое напряжение в плечах, лице или животе?',
    left: '0 — тело расслаблено',
    right: '10 — всё сковано',
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
  const todayDone = useCheckinStore((s) => s.todayCheckinDone)
  const completeCheckin = useCheckinStore((s) => s.completeCheckin)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([5, 5, 5, 5])
  const [result, setResult] = useState(null)
  const prevStepRef = useRef(0)
  const direction = step >= prevStepRef.current ? 'forward' : 'backward'
  prevStepRef.current = step

  useEffect(() => {
    // Only redirect if checkin was already done BEFORE entering this screen.
    // After completing it on this screen we keep the result visible.
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
    const IS = completeCheckin({ q1, q2, q3, q4 })
    setResult({ IS, ...interpretIS(IS) })
    postCheckin({ q1, q2, q3, q4, IS }).catch(() => {})
  }

  if (result) return <ResultScreen result={result} onContinue={() => navigate('/')} />



  const q = QUESTIONS[step]

  return (
    <ScreenShell>
      <div className="flex min-h-[90dvh] flex-col">
        <Progress step={step + 1} total={4} />

        <div className="relative mt-6 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              initial={stepVariants[direction].initial}
              animate={stepVariants[direction].animate}
              exit={stepVariants[direction].exit}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <div className="label-mono">{q.title}</div>
              <h1 className="mt-2 font-serif text-[26px] leading-tight text-fg-0">
                {step === 0 ? 'Как ты сейчас?' : q.question}
              </h1>
              {step > 0 && (
                <p className="mt-3 text-[14px] text-fg-2">Займёт меньше минуты</p>
              )}

              <div className="mt-10">
                {step === 0 && (
                  <p className="mb-6 text-[15px] text-fg-1">{q.question}</p>
                )}
                <Slider
                  value={answers[step]}
                  onChange={setAnswer}
                  leftLabel={q.left}
                  rightLabel={q.right}
                />
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
