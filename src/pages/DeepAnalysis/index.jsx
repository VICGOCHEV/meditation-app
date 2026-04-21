import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import Slider from '../../components/ui/Slider'
import { useProgression } from '../../hooks/useProgression'
import { useProgressStore } from '../../store/useProgressStore'
import { calcIT, calcIO, calcKT, interpretKT } from '../../utils/scoreCalc'
import { postDeepAnalysis } from '../../api/checkin'

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

const Q = [
  { block: 'А', title: 'Прошлое', text: 'Насколько навязчивыми были мысли о прошлом в последние 3 дня?' },
  { block: 'А', title: 'Будущее', text: 'Как часто фокус смещался на тревожное ожидание будущего?' },
  { block: 'А', title: 'Тревога', text: 'Оцени средний уровень тревоги за этот период' },
  { block: 'А', title: 'Критик', text: 'Насколько громко звучал твой «внутренний критик» в эти дни?' },
  { block: 'А', title: 'Тело', text: 'Заметил(а) ли ты физическое напряжение в теле (челюсть, плечи)?' },
  { block: 'Б', title: 'Здесь и сейчас', text: 'Удавалось ли тебе возвращать внимание в «здесь и сейчас» во время рутины?' },
  { block: 'Б', title: 'Тишина', text: 'Насколько часто ты ощущал(а) состояние «внутренней тишины»?' },
  { block: 'Б', title: 'Сигналы тела', text: 'Насколько хорошо ты чувствуешь сигналы своего тела (зажимы, тепло, пульсацию)?' },
  { block: 'Б', title: 'Восстановление', text: 'Оцени свою способность быстро возвращать спокойствие после стресса' },
  { block: 'Б', title: 'Потребности', text: 'Насколько ты чувствуешь связь со своими истинными потребностями сегодня?' },
]

export default function DeepAnalysis() {
  const navigate = useNavigate()
  const { canDoDeepAnalysis, daysUntilAnalysis } = useProgression()
  const unlockNext = useProgressStore((s) => s.unlockNextPractice)
  const recordAnalysis = useProgressStore((s) => s.recordDeepAnalysis)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(Array(10).fill(5))
  const [result, setResult] = useState(null)
  const prevStepRef = useRef(0)
  const direction = step >= prevStepRef.current ? 'forward' : 'backward'
  prevStepRef.current = step

  if (!canDoDeepAnalysis) {
    return (
      <ScreenShell>
        <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
          <div className="label-mono mb-4">Глубокий анализ</div>
          <h1 className="font-serif text-3xl text-fg-0">Ещё рано</h1>
          <p className="mt-4 max-w-xs text-[15px] text-fg-2">
            Глубокий анализ будет доступен через {daysUntilAnalysis} {daysUntilAnalysis === 1 ? 'день' : 'дней'}.
          </p>
          <div className="mt-8 w-full max-w-xs">
            <Button size="lg" fullWidth variant="secondary" onClick={() => navigate('/')}>
              ← На главную
            </Button>
          </div>
        </div>
      </ScreenShell>
    )
  }

  const setAnswer = (v) => {
    const next = answers.slice()
    next[step] = v
    setAnswers(next)
  }

  const onNext = async () => {
    if (step < 9) {
      setStep(step + 1)
      return
    }
    const IT = calcIT(answers[0], answers[1], answers[2], answers[3], answers[4])
    const IO = calcIO(answers[5], answers[6], answers[7], answers[8], answers[9])
    const KT = calcKT(IO, IT)
    recordAnalysis(KT)
    setResult({ IT, IO, KT, ...interpretKT(KT) })
    postDeepAnalysis({ answers, IT, IO, KT }).catch(() => {})
  }

  if (result) {
    const sign = result.KT > 0 ? '+' : ''
    return (
      <ScreenShell>
        <div className="flex min-h-[80dvh] flex-col animate-fade-in">
          <div className="label-mono mb-2">Результат</div>
          <h1 className="font-serif text-3xl text-fg-0">Твой прогресс за 3 дня</h1>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="panel text-center">
              <div className="label-mono">Тревожность</div>
              <div className="mt-2 font-serif text-3xl text-fg-0">
                {result.IT.toFixed(1)}
                <span className="ml-1 text-base text-fg-3">/10</span>
              </div>
            </div>
            <div className="panel text-center">
              <div className="label-mono">Осознанность</div>
              <div className="mt-2 font-serif text-3xl text-fg-0">
                {result.IO.toFixed(1)}
                <span className="ml-1 text-base text-fg-3">/10</span>
              </div>
            </div>
          </div>

          <div className="mt-6 panel text-center">
            <div className="label-mono">Коэффициент трансформации</div>
            <div className="mt-3 font-serif text-[56px] leading-none text-fg-0">
              {sign}{result.KT.toFixed(1)}
            </div>
            <p className="mt-6 text-[15px] leading-relaxed text-fg-1">
              {result.emoji} {result.text}
            </p>
          </div>

          <div className="mt-8">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                unlockNext()
                navigate('/')
              }}
            >
              Открыть следующую практику
            </Button>
          </div>
        </div>
      </ScreenShell>
    )
  }

  const q = Q[step]
  const showBlockHeader = step === 0 || step === 5

  return (
    <ScreenShell>
      <div className="flex min-h-[90dvh] flex-col">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-[14px] text-fg-2 hover:text-fg-0">
            ← Назад
          </button>
          <div className="label-mono">{step + 1} / 10</div>
        </div>

        <div className="mt-4 flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={[
                'h-1 flex-1 rounded-full',
                i <= step ? 'bg-lilac' : 'bg-white/10',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="relative mt-6 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={stepVariants[direction].initial}
              animate={stepVariants[direction].animate}
              exit={stepVariants[direction].exit}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {showBlockHeader && (
                <div className="label-mono text-lilac">
                  {q.block === 'А' ? 'Блок А · Тревожность' : 'Блок Б · Осознанность'}
                </div>
              )}
              <div className="mt-6 label-mono">{q.title}</div>
              <h1 className="mt-2 font-serif text-[22px] leading-tight text-fg-0">
                {q.text}
              </h1>

              <div className="mt-10">
                <Slider
                  value={answers[step]}
                  onChange={setAnswer}
                  leftLabel="0"
                  rightLabel="10"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>Назад</Button>
          )}
          <Button fullWidth size="lg" onClick={onNext}>
            {step === 9 ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </ScreenShell>
  )
}
