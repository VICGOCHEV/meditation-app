import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion'
import { Sec, Title, Lead, Tech } from '../components/caseui'
import TiltCard from '../components/TiltCard'
import ShinyButton from '../components/app/ShinyButton'

const EASE = [0.22, 0.8, 0.36, 1]
const PLATE_FEATURES = [
  'Курс осознанности — 6 практик каждый месяц',
  'Ежедневный чек-ин и трекер состояния',
  'Глубокий анализ на контрольных точках',
  'Выбор голоса и музыкального фона',
]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }
const item = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }

const INTEGR = [
  { n: '01', t: 'Виджет внутри приложения', d: 'Оплата прямо в интерфейсе через встроенный виджет ЮKassa — без редиректов на сторонние сайты. Пользователь остаётся в атмосфере продукта.' },
  { n: '02', t: 'Webhook-активация', d: 'После успешной оплаты ЮKassa присылает webhook — бэкенд сам открывает доступ и включает подписку. Без ручных действий.' },
  { n: '03', t: 'Способы оплаты', d: 'Карты, СБП, Apple Pay и Google Pay — привычными способами, в один тап.' },
  { n: '04', t: 'Гибкость', d: 'Отмена в один тап, доступ — до конца оплаченного периода. Авторские практики можно купить поштучно за 99 ₽.' },
]
const N = INTEGR.length

function Diamond() {
  return <svg viewBox="0 0 24 24" className="mt-1 h-3.5 w-3.5 shrink-0 text-lilac" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></svg>
}
function YooKassaMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl font-display text-[26px] font-medium text-white" style={{ background: 'linear-gradient(150deg,#6145c2,#9a8cf0)', boxShadow: '0 0 28px -6px rgba(97,69,194,0.8)' }}>Ю</span>
      <span className="font-display text-[28px] font-light text-fg-0">Kassa</span>
    </div>
  )
}
function TariffPlate() {
  return (
    <div className="flex justify-center" style={{ perspective: 1300 }}>
      <motion.div initial={{ opacity: 0, y: 60, rotateX: 14, scale: 0.93 }} whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} viewport={{ once: true, margin: '-10% 0px' }} transition={{ duration: 1.1, ease: EASE }} className="w-full max-w-md">
        <TiltCard className="glass-panel relative p-9 sm:p-11" baseRotY={-10} baseRotX={6}>
          <div className="pointer-events-none absolute -inset-10 -z-10" style={{ background: 'radial-gradient(50% 50% at 50% 40%, rgba(97,69,194,0.4), transparent 70%)', filter: 'blur(30px)' }} />
          <motion.div className="relative z-10 text-center" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-10% 0px' }}>
            <motion.p variants={item} className="mono text-xs uppercase tracking-[0.18em] text-lilac">Осознанность</motion.p>
            <motion.div variants={item} className="mt-5 flex items-end justify-center gap-2">
              <span className="font-display text-6xl font-extralight text-fg-0">199</span>
              <span className="mb-2 text-fg-3">₽ / мес</span>
            </motion.div>
            <motion.p variants={item} className="mt-2 text-sm text-fg-3">7 дней бесплатно · отмена в один тап</motion.p>
            <motion.div variants={item} className="my-7 h-px w-full bg-line" />
            <ul className="space-y-3 text-left">
              {PLATE_FEATURES.map((f) => (<motion.li key={f} variants={item} className="flex items-start gap-3 text-fg-1"><Diamond /><span className="leading-snug">{f}</span></motion.li>))}
            </ul>
            <motion.div variants={item} className="mt-9 flex justify-center"><ShinyButton>Получить ключи к жизни</ShinyButton></motion.div>
            <motion.p variants={item} className="mt-5 text-xs text-fg-4">Нужны все авторские практики? Тариф «Всё включено» — 299 ₽/мес.</motion.p>
          </motion.div>
        </TiltCard>
      </motion.div>
    </div>
  )
}

export default function Monetization() {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3, restDelta: 0.0004 })
  useMotionValueEvent(p, 'change', (v) => { const i = Math.min(N - 1, Math.max(0, Math.floor(v * N - 1e-4))); if (i !== idx) setIdx(i) })
  const seg = 1 / N
  const op = (i) => {
    const a = i * seg, b = (i + 1) * seg, f = seg * 0.32
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTransform(p, [i === 0 ? -1 : a - f, a + f, b - f, i === N - 1 ? 2 : b + f], [0, 1, 1, 0])
  }
  const ops = INTEGR.map((_, i) => op(i))

  return (
    <>
      {/* заголовок секции — один раз */}
      <Sec id="money" num="10" tag="Monetization" ghost="07" wide className="!pb-4">
        <div className="max-w-2xl">
          <Title className="text-[clamp(2rem,5vw,3.4rem)]">Монетизация</Title>
          <Lead className="mt-6">Подписка с бесплатным входом, гибкими тарифами и оплатой, встроенной прямо в интерфейс.</Lead>
        </div>
      </Sec>

      {/* sticky-скролл: тариф слева, фичи ЮKassa по одной на скролл */}
      <section ref={ref} style={{ height: `${N * 100}vh` }} className="relative">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
            <div className="hidden lg:block"><TariffPlate /></div>
            <div className="relative">
              <p className="label-mono mb-4">Платёжная интеграция</p>
              <YooKassaMark />
              <div className="mt-6 flex gap-2">
                {INTEGR.map((s, i) => (
                  <span key={s.n} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(180,160,255,0.14)' }}>
                    <motion.span className="block h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6145c2,#d6c8ff)', transformOrigin: 'left' }} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.4 }} />
                  </span>
                ))}
              </div>
              <div className="relative mt-8 min-h-[240px]">
                {INTEGR.map((s, i) => (
                  <motion.div key={s.n} className="absolute inset-0 flex flex-col justify-center" style={{ opacity: ops[i] }}>
                    <span className="font-mono text-sm text-violet">{s.n} / 0{N}</span>
                    <h3 className="mt-3 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-extralight leading-[1.05] text-fg-0">{s.t}</h3>
                    <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-2 sm:text-[17px]">{s.d}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {['ЮKassa API', 'inline widget', 'webhook', 'СБП', 'Apple / Google Pay'].map((t) => <Tech key={t}>{t}</Tech>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* тариф на мобайле — под скроллом */}
      <div className="mx-auto max-w-md px-5 pb-20 lg:hidden"><TariffPlate /></div>
    </>
  )
}
