import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sec, Title, Lead } from '../components/caseui'
import { Up, StoryItem, Cap } from '../components/story'
import Icon from '../lib/icons'

/* ─────────────────────────────────────────────────────────────
   Анимированный флоу CMS: курсор сам проходит сценарий
   «создать практику → заполнить → добавить аудио → опубликовать».
   Зацикленный автоплей, пауза когда секция вне экрана.
   ───────────────────────────────────────────────────────────── */

const NAV = [
  { i: 'database', t: 'Практики', a: true }, { i: 'chart', t: 'Дашборд' }, { i: 'tariff', t: 'Подписки' }, { i: 'feedback', t: 'Обращения' },
]
const STEPS = [
  { label: 'Создать практику', cursor: { x: '90%', y: '15%' } },
  { label: 'Заполнить поля', cursor: { x: '34%', y: '34%' } },
  { label: 'Добавить аудио', cursor: { x: '55%', y: '62%' } },
  { label: 'Опубликовать', cursor: { x: '32%', y: '90%' } },
]
const NAME = 'День 05 · Тишина ума'
const CELLS = [['Мужской', 'Дождь'], ['Мужской', 'Хвоя'], ['Мужской', 'Океан'], ['Женский', 'Дождь'], ['Женский', 'Хвоя'], ['Женский', 'Океан']]

function TypedName({ active, done }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active && !done) { setN(0); return }
    if (done) { setN(NAME.length); return }
    let i = 0
    const id = setInterval(() => { i += 1; setN(i); if (i >= NAME.length) clearInterval(id) }, 55)
    return () => clearInterval(id)
  }, [active, done])
  return (
    <span className="text-[12px] text-fg-0">
      {NAME.slice(0, n)}
      {active && <span className="ml-0.5 inline-block h-3.5 w-[2px] -translate-y-[1px] animate-pulse bg-lilac align-middle" />}
    </span>
  )
}

function AnimatedCms() {
  const ref = useRef(null)
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(false)

  // запускаем автоплей только когда в экране
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setRun(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!run) return
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2400)
    return () => clearInterval(id)
  }, [run])

  const showForm = step >= 1
  const showAudio = step >= 2
  const published = step >= 3

  return (
    <div ref={ref} className="case-card relative overflow-hidden p-0">
      {/* браузер-хром */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(180,160,255,0.1)', background: 'rgba(8,6,16,0.6)' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate font-mono text-[11px] text-fg-3">all-relaxme.ru/manage</span>
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.14em] text-lilac sm:block">{STEPS[step].label}</span>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-[180px_1fr]">
        {/* сайдбар */}
        <div className="hidden flex-col gap-1 p-4 sm:flex" style={{ borderRight: '1px solid rgba(180,160,255,0.08)' }}>
          <div className="mb-3 flex items-center gap-2 px-2 text-fg-1"><Icon name="sphere" size={16} className="text-lilac" /><span className="text-[12px]">RelaxMe CMS</span></div>
          {NAV.map((m) => (
            <span key={m.t} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px]" style={{ background: m.a ? 'rgba(97,69,194,0.16)' : 'transparent', color: m.a ? '#f4f0ff' : '#a99ecb' }}>
              <Icon name={m.i} size={15} /> {m.t}
            </span>
          ))}
        </div>

        {/* контент */}
        <div className="relative min-h-[360px] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-light text-fg-0">Новая практика</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">Курс осознанности</p>
            </div>
            <motion.span
              className="btn-primary-app px-3.5 py-2 text-[11px]"
              animate={step === 0 ? { scale: [1, 0.94, 1], boxShadow: ['0 0 0 0 rgba(97,69,194,0)', '0 0 0 8px rgba(97,69,194,0.25)', '0 0 0 0 rgba(97,69,194,0)'] } : {}}
              transition={{ duration: 1.2, repeat: step === 0 ? Infinity : 0 }}
            >
              <Icon name="layers" size={13} className="text-white" /> Добавить
            </motion.span>
          </div>

          {/* форма */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0 }} className="space-y-2.5 overflow-hidden">
                <div>
                  <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-3">Название</p>
                  <div className="flex h-9 items-center rounded-lg px-3" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${step === 1 ? 'rgba(180,160,255,0.4)' : 'rgba(180,160,255,0.14)'}` }}>
                    <TypedName active={step === 1} done={step > 1} />
                  </div>
                </div>
                <div className="flex gap-2.5">
                  {['Длительность', 'Доступ'].map((f, i) => (
                    <div key={f} className="flex-1">
                      <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-3">{f}</p>
                      <div className="flex h-9 items-center rounded-lg px-3 text-[11px] text-fg-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,160,255,0.14)' }}>{i ? 'По подписке' : '18 мин'}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* аудио-матрица */}
          <AnimatePresence>
            {showAudio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-3">Матрица аудио · 2 × 3</p>
                <div className="grid grid-cols-3 gap-2">
                  {CELLS.map(([v, m], i) => (
                    <motion.div key={v + m} initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.12, ease: [0.22, 0.9, 0.3, 1] }}
                      className="rounded-lg p-2" style={{ background: 'rgba(14,10,28,0.85)', border: '1px solid rgba(180,160,255,0.08)' }}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-fg-3">{v}</span>
                        <span className="grid h-4 w-4 place-items-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.2)' }}><Icon name="play" size={8} /></span>
                      </div>
                      <p className="mb-1 truncate text-[9px] text-fg-1">{m}</p>
                      <div className="flex h-3.5 items-end gap-[1.5px]">
                        {Array.from({ length: 12 }).map((_, j) => (
                          <span key={j} className="wave-bar flex-1 rounded-full" style={{ height: `${25 + ((j * 41) % 75)}%`, background: 'linear-gradient(180deg,#6145c2,#4a35a0)', animationDelay: `${(j % 5) * 0.12}s` }} />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* публикация */}
          <motion.div className="mt-5 flex items-center gap-3"
            animate={step === 3 ? { scale: [1, 0.97, 1] } : {}} transition={{ duration: 1, repeat: step === 3 ? Infinity : 0 }}>
            <span className="rounded-full px-4 py-2 text-[12px]" style={{ background: published ? 'linear-gradient(180deg, oklch(0.62 0.19 300), oklch(0.52 0.20 288))' : 'rgba(180,160,255,0.08)', color: '#fff', border: '1px solid rgba(180,160,255,0.2)', boxShadow: step === 3 ? '0 0 0 8px rgba(97,69,194,0.2)' : 'none' }}>
              Опубликовать
            </span>
            <AnimatePresence>
              {published && (
                <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: '#9ad6b4' }}>
                  <Icon name="check" size={13} /> практика опубликована
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* курсор */}
          <motion.div className="pointer-events-none absolute z-30" animate={{ left: STEPS[step].cursor.x, top: STEPS[step].cursor.y }} transition={{ duration: 0.8, ease: [0.5, 0, 0.2, 1] }} style={{ left: STEPS[0].cursor.x, top: STEPS[0].cursor.y }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#f4f0ff" stroke="#0a0714" strokeWidth="1" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
              <path d="M5 3l14 7-6 2-2 6-6-15z" />
            </svg>
            <motion.span key={step} className="absolute left-0 top-0 h-5 w-5 rounded-full border border-lilac" initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.7, delay: 0.7 }} />
          </motion.div>
        </div>
      </div>

      {/* шаги-индикатор */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6" style={{ borderTop: '1px solid rgba(180,160,255,0.08)', background: 'rgba(8,6,16,0.4)' }}>
        {STEPS.map((s, i) => (
          <span key={s.label} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors" style={{ color: i === step ? '#f4f0ff' : '#6e6290' }}>
            <span className="grid h-4 w-4 place-items-center rounded-full text-[8px]" style={{ background: i === step ? '#6145c2' : 'rgba(180,160,255,0.1)', color: i === step ? '#fff' : '#a99ecb' }}>{i + 1}</span>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const POINTS = [
  { icon: 'tokens', t: 'Матрица аудио 2×3', d: 'Голоса (М/Ж) × 3 музыки — каждая ячейка с превью-плеером.' },
  { icon: 'layers', t: 'Практика в один клик', d: 'Полный пак полей без кода — от 1 до 20 практик.' },
  { icon: 'chart', t: 'Дашборд и модерация', d: 'Подписки, активность, обращения и ручное управление доступами.' },
  { icon: 'database', t: 'Миграция со Strapi', d: 'Прогресс пользователей перенесён незаметно и без потерь.' },
]

export default function CmsControl() {
  return (
    <Sec id="cms" num="13" tag="Custom CMS" ghost="10" wide>
      <div className="max-w-2xl">
        <Title className="text-[clamp(2rem,5vw,3.4rem)]">Пульт управления тишиной</Title>
        <Lead className="mt-6">Strapi не подошёл — перегружен и неудобен. Собрал собственную CMS под контент именно этого продукта. Смотрите, как практика собирается за четыре шага.</Lead>
      </div>

      <Up><div className="mt-14"><AnimatedCms /></div></Up>

      <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p, i) => (
          <StoryItem key={p.t} icon={p.icon} title={p.t} index={`0${i + 1}`} delay={(i % 4) * 0.06}>
            <Cap size="sm">{p.d}</Cap>
          </StoryItem>
        ))}
      </div>
    </Sec>
  )
}
