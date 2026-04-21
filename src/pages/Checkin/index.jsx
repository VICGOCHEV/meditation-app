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
    initial: { opacity: 0, x: 36 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -36 },
  },
  backward: {
    initial: { opacity: 0, x: -36 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 36 },
  },
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
    if (todayDone) navigate('/', { replace: true })
  }, [todayDone, navigate])

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

  if (result) {
    return (
      <ScreenShell>
        <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center animate-fade-in">
          <div className="label-mono mb-3 text-lilac">Индекс состояния · {result.IS}/40</div>
          <h1 className="font-serif text-[48px] leading-none text-fg-0">
            {result.state}
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-fg-1">
            {result.text}
          </p>
          <div className="mt-10 w-full">
            <Button size="lg" fullWidth onClick={() => navigate('/')}>
              Начать практику
            </Button>
          </div>
        </div>
      </ScreenShell>
    )
  }

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
              transition={{ duration: 0.3, ease: EASE }}
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
