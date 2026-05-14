import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ScreenShell from '../../components/ui/ScreenShell'
import Button from '../../components/ui/Button'
import DialSlider from '../../components/ui/DialSlider'
import KTGauge from '../../components/ui/KTGauge'
import Sparkline from '../../components/ui/Sparkline'
import CountUp from '../../components/ui/CountUp'
import { useProgression } from '../../hooks/useProgression'
import { useProgressStore } from '../../store/useProgressStore'
import {
  calcIT,
  calcIO,
  calcKT,
  interpretKT,
  interpretIT,
  interpretIO,
  ktDelta,
} from '../../utils/scoreCalc'
import { postDeepAnalysis } from '../../api/checkin'
import { findPractice } from '../../api/mock'

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

// Question copy is verbatim from the spec the user pasted (Block A · ИТ
// Q1–Q5, Block Б · ИО Q1–Q5). Anchors are short phrases shown under the
// slider's 0 and 10 ticks so the scale is unambiguous per question.
const Q = [
  { block: 'А', title: 'Прошлое',       text: 'Насколько навязчивыми были мысли о прошлом в последние 3 дня?',                       left: 'не отвлекали', right: 'постоянно' },
  { block: 'А', title: 'Будущее',       text: 'Как часто фокус смещался на тревожное ожидание будущего?',                              left: 'жил в моменте', right: 'жил в «завтра»' },
  { block: 'А', title: 'Беспокойство',  text: 'Оцени средний уровень тревоги за этот период.',                                          left: 'спокойствие',   right: 'сильная тревога' },
  { block: 'А', title: 'Критик',        text: 'Насколько громко звучал твой «внутренний критик» в эти дни?',                            left: 'тихо',          right: 'оглушительно' },
  { block: 'А', title: 'Напряжение',    text: 'Заметил(а) ли ты физическое напряжение в теле (челюсть, плечи) в течение этих дней?',     left: 'тело свободно', right: 'всё сковано' },
  { block: 'Б', title: 'Момент',        text: 'Удавалось ли тебе возвращать внимание в «здесь и сейчас» во время рутинных дел?',          left: 'почти нет',     right: 'постоянно' },
  { block: 'Б', title: 'Тишина',        text: 'Насколько часто ты ощущал(а) состояние «внутренней тишины»?',                              left: 'не было',       right: 'часто' },
  { block: 'Б', title: 'Телесность',    text: 'Насколько хорошо ты чувствуешь сигналы своего тела (зажимы, тепло, пульсацию)?',           left: 'тело молчит',   right: 'ясные сигналы' },
  { block: 'Б', title: 'Восстановление', text: 'Оцени свою способность быстро возвращать спокойствие после стресса.',                     left: 'долго',         right: 'мгновенно' },
  { block: 'Б', title: 'Связь с «Я»',    text: 'Насколько ты чувствуешь связь со своими истинными потребностями сегодня?',                left: 'потерян(а)',    right: 'ясно слышу' },
]

// ── Result-screen choreography ──────────────────────────────────────
// Two stages, gated on a `stage` state flip after 1.5 s:
//   Stage 1 (numbers): header → KT gauge → ИТ / ИО panels.
//     Each section uses explicit `initial` + `animate` with a
//     hand-tuned `delay`, then a `PulseOnSettle` scale beat once the
//     count-up + bar fill finish.
//   Stage 2 (narrative): interpretation panel → narrative bands →
//     sparkline → unlock callouts → CTA. Separate AnimatePresence so
//     stage 2 fades in only after stage 1 settles.
//
// Earlier iteration used parent variants + staggerChildren; switched
// to explicit per-element `initial`/`animate` because the variant
// approach occasionally rendered the page with everything already at
// the visible state on first mount (no perceptible enter animation).

function PulseOnSettle({ children, delay = 0 }) {
  // Tiny breath after the settle: scale 1 → 1.04 → 1 in 540 ms.
  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 0.54, ease: EASE, delay, times: [0, 0.45, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ResultScreen({ result, historyAtMount, onContinue }) {
  const sign = result.KT > 0 ? '+' : ''
  const newPractice = result.newlyUnlockedId ? findPractice(result.newlyUnlockedId) : null
  const newBonusPractices = (result.newlyUnlockedBonus || [])
    .map((id) => findPractice(id))
    .filter(Boolean)
  const sparkData = [...historyAtMount.map((h) => h.kt), result.KT]
  const positive = result.KT > 0

  // After the count-ups + bar fills land (~1.4s) we light up the
  // "interpretation" stage which gates the text + callouts + CTA.
  const [stage, setStage] = useState('numbers') // 'numbers' | 'narrative'
  useEffect(() => {
    const t = setTimeout(() => setStage('narrative'), 1500)
    return () => clearTimeout(t)
  }, [])

  const reveal = (delay) => ({
    initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.85, ease: EASE, delay },
  })

  return (
    <ScreenShell>
      <div className="flex min-h-[90dvh] flex-col">
        <motion.div {...reveal(0)}>
          <div className="label-mono">Результат</div>
          <h1 className="mt-1 font-serif text-3xl text-fg-0">Прогресс за 3 дня</h1>
        </motion.div>

        {/* KT gauge */}
        <motion.div {...reveal(0.18)} className="mt-6 panel">
          <div className="flex items-center justify-between">
            <div className="label-mono">Коэффициент трансформации</div>
            {result.delta != null && (
              <span
                className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.15em]"
                style={{
                  background:
                    result.delta >= 0 ? 'rgba(123,225,163,.16)' : 'rgba(230,168,120,.16)',
                  color: result.delta >= 0 ? '#9ce8b9' : '#f0b48f',
                  border: '1px solid rgba(180,160,255,.18)',
                }}
              >
                {result.delta > 0 ? '↑' : result.delta < 0 ? '↓' : '·'}{' '}
                {result.delta > 0 ? '+' : ''}
                {result.delta} vs прошлый раз
              </span>
            )}
          </div>

          <div className="mt-3">
            <KTGauge value={result.KT} />
          </div>

          <PulseOnSettle delay={1.3}>
            <div
              className="-mt-4 text-center font-serif leading-none text-fg-0"
              style={{ fontSize: 64 }}
            >
              <CountUp
                value={result.KT}
                duration={1100}
                decimals={1}
                prefix={sign}
                delay={250}
              />
            </div>
          </PulseOnSettle>
        </motion.div>

        {/* ИТ / ИО */}
        <motion.div {...reveal(0.32)} className="mt-4 grid grid-cols-2 gap-3">
          <PulseOnSettle delay={1.55}>
            <div className="panel h-full">
              <div className="label-mono">ИТ · Тревожность</div>
              <div className="mt-2 font-serif text-3xl text-fg-0">
                <CountUp value={result.IT} duration={1000} decimals={1} delay={350} />
                <span className="ml-1 text-base text-fg-3">/10</span>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(result.IT / 10) * 100}%` }}
                  transition={{ duration: 1.0, ease: EASE, delay: 0.7 }}
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #9eb5ff, #e6a878)' }}
                />
              </div>
            </div>
          </PulseOnSettle>

          <PulseOnSettle delay={1.55}>
            <div className="panel h-full">
              <div className="label-mono">ИО · Осознанность</div>
              <div className="mt-2 font-serif text-3xl text-fg-0">
                <CountUp value={result.IO} duration={1000} decimals={1} delay={350} />
                <span className="ml-1 text-base text-fg-3">/10</span>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(result.IO / 10) * 100}%` }}
                  transition={{ duration: 1.0, ease: EASE, delay: 0.8 }}
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #9eb5ff, #7be1a3)' }}
                />
              </div>
            </div>
          </PulseOnSettle>
        </motion.div>

        {/* Narrative stage — appears AFTER numbers settle */}
        <AnimatePresence>
          {stage === 'narrative' && (
            <motion.div
              key="narrative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-col"
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
                className="mt-4 panel text-center text-[15px] leading-relaxed text-fg-1"
                style={{ color: positive ? '#cff6dd' : '#f1dcc4' }}
              >
                {result.emoji} {result.text}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                className="mt-3 grid grid-cols-2 gap-3"
              >
                <p className="text-[12px] leading-snug text-fg-3">
                  {interpretIT(result.IT)}
                </p>
                <p className="text-[12px] leading-snug text-fg-3">
                  {interpretIO(result.IO)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
                className="mt-4 panel"
              >
                <div className="flex items-center justify-between">
                  <div className="label-mono">История КТ</div>
                  <div className="font-mono text-[11px] text-fg-3">
                    {sparkData.length} замер{sparkData.length === 1 ? '' : 'а'}
                  </div>
                </div>
                <div className="mt-3">
                  <Sparkline data={sparkData} />
                </div>
              </motion.div>

              {(newPractice || newBonusPractices.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
                  className="mt-3 flex flex-col gap-2"
                >
                  {newPractice && (
                    <div
                      className="rounded-md px-4 py-3 text-[13px] text-fg-0"
                      style={{
                        background: 'rgba(123,225,163,.10)',
                        border: '1px solid rgba(123,225,163,.28)',
                      }}
                    >
                      🔓 Открыта практика «{newPractice.title}»
                    </div>
                  )}
                  {newBonusPractices.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md px-4 py-3 text-[13px] text-fg-0"
                      style={{
                        background: 'rgba(97,69,194,.18)',
                        border: '1px solid rgba(180,160,255,.28)',
                      }}
                    >
                      🎁 Бонус: «{p.title}» теперь бесплатно
                    </div>
                  ))}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
                className="mt-6"
              >
                <Button size="lg" fullWidth onClick={onContinue}>
                  {newPractice ? 'Перейти к практике' : 'На главную'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenShell>
  )
}

const BLOCK_INTRO = {
  А: {
    title: 'Блок А · Индекс тревожности',
    subtitle: 'Высокий балл сигнализирует о необходимости расслабляющего контента.',
  },
  Б: {
    title: 'Блок Б · Индекс осознанности',
    subtitle: 'Высокий балл подтверждает эффективность практик и прогресс.',
  },
}

export default function DeepAnalysis() {
  const navigate = useNavigate()
  const { canDoDeepAnalysis, daysUntilAnalysis, ktHistory } = useProgression()
  const unlockNext = useProgressStore((s) => s.unlockNextPractice)
  const recordAnalysis = useProgressStore((s) => s.recordDeepAnalysis)
  const unlockBonus = useProgressStore((s) => s.unlockBonus)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(Array(10).fill(5))
  const [result, setResult] = useState(null)
  const prevStepRef = useRef(0)
  const direction = step >= prevStepRef.current ? 'forward' : 'backward'
  prevStepRef.current = step

  // Snapshot history BEFORE we record the new entry, so we can show
  // "vs прошлый раз" and a sparkline of where this run sits.
  const historyAtMount = useMemo(() => ktHistory || [], [])

  // The "слишком рано" guard must run AFTER the in-memory `result`
  // check below. Otherwise: as soon as `recordAnalysis(KT)` lands in
  // the store, `lastDeepAnalysisDate` flips to "now", `canDoDeepAnalysis`
  // becomes false on the next render, and the user sees "Ещё рано · 3 дн."
  // instead of their freshly computed result.
  if (!canDoDeepAnalysis && !result) {
    const pct = Math.max(0, Math.min(1, (3 - daysUntilAnalysis) / 3))
    return (
      <ScreenShell>
        <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
          <div className="label-mono mb-4">Глубокий анализ</div>

          {/* Countdown ring */}
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(180,160,255,.16)" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#6145c2" strokeWidth="6" strokeLinecap="round"
                pathLength="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: pct }}
                transition={{ duration: 1, ease: EASE }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(97,69,194,.65))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-serif text-4xl text-fg-0">{daysUntilAnalysis}</div>
              <div className="label-mono mt-1">{daysUntilAnalysis === 1 ? 'день' : 'дн.'}</div>
            </div>
          </div>

          <h1 className="mt-6 font-serif text-3xl text-fg-0">Ещё рано</h1>
          <p className="mt-3 max-w-xs text-[15px] text-fg-2">
            Глубокий анализ откроется через {daysUntilAnalysis}{' '}
            {daysUntilAnalysis === 1 ? 'день' : 'дней'}. Продолжай практиковать —
            данные за период станут точнее.
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

  const onNext = () => {
    if (step < 9) {
      setStep(step + 1)
      return
    }
    const IT = calcIT(answers[0], answers[1], answers[2], answers[3], answers[4])
    const IO = calcIO(answers[5], answers[6], answers[7], answers[8], answers[9])
    const KT = calcKT(IO, IT)
    const delta = ktDelta(KT, historyAtMount)
    recordAnalysis(KT)
    const newlyUnlockedId = unlockNext()
    const newlyUnlockedBonus = unlockBonus()
    setResult({
      IT,
      IO,
      KT,
      delta,
      ...interpretKT(KT),
      newlyUnlockedId,
      newlyUnlockedBonus,
    })
    postDeepAnalysis({ answers, IT, IO, KT }).catch(() => {})
  }

  if (result) {
    return (
      <ResultScreen
        result={result}
        historyAtMount={historyAtMount}
        onContinue={() => navigate('/')}
      />
    )
  }

  const q = Q[step]
  const blockIntro = step === 0 || step === 5 ? BLOCK_INTRO[q.block] : null
  const blockCount = step < 5 ? `${step + 1} / 5` : `${step - 4} / 5`

  return (
    <ScreenShell fixed>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
            className="text-[14px] text-fg-2 hover:text-fg-0"
          >
            ← Назад
          </button>
          <div className="label-mono">{step + 1} / 10</div>
        </div>

        {/* Two-block progress: 5 ticks for А, 5 for Б, with a gap */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={`a-${i}`}
                className={[
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-lilac' : 'bg-white/10',
                ].join(' ')}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[.18em] text-lilac/70">
            {q.block === 'А' ? `А · ${blockCount}` : 'А'}
          </span>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={`b-${i}`}
                className={[
                  'h-1 flex-1 rounded-full transition-colors',
                  i + 5 <= step ? 'bg-lilac' : 'bg-white/10',
                ].join(' ')}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[.18em] text-lilac/70">
            {q.block === 'Б' ? `Б · ${blockCount}` : 'Б'}
          </span>
        </div>

        <div className="relative mt-6 min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={stepVariants[direction].initial}
              animate={stepVariants[direction].animate}
              exit={stepVariants[direction].exit}
              transition={{ duration: 0.65, ease: EASE }}
              className="absolute inset-0 flex flex-col"
            >
              {blockIntro && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: EASE, delay: 0.15 }}
                  className="mb-6 rounded-md p-4"
                  style={{
                    background: 'rgba(97,69,194,.12)',
                    border: '1px solid rgba(180,160,255,.22)',
                  }}
                >
                  <div className="label-mono">{blockIntro.title}</div>
                  <p className="mt-1 text-[13px] leading-snug text-fg-1">
                    {blockIntro.subtitle}
                  </p>
                </motion.div>
              )}

              <div className="label-mono">{q.title}</div>
              <h1 className="mt-2 font-serif text-[22px] leading-tight text-fg-0">
                {q.text}
              </h1>

              {/* Dial locked to the centre of the remaining space so it
                  doesn't drift between Q1 (block intro present) and
                  later questions. */}
              <div className="flex flex-1 items-center justify-center">
                <DialSlider value={answers[step]} onChange={setAnswer} />
              </div>

              <div className="flex justify-between font-mono text-[11px] uppercase tracking-[.15em] text-fg-3">
                <span>{q.left}</span>
                <span>{q.right}</span>
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
            {step === 9 ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </ScreenShell>
  )
}
