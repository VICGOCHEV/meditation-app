import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Section, Reveal, Eyebrow } from '../components/primitives'
import TiltCard from '../components/TiltCard'
import MouseFloat from '../components/MouseFloat'

const EASE = [0.22, 0.8, 0.36, 1]

// Карточку можно «поводить пальцем» — горизонтальный drag с 3D-наклоном и
// возвратом на место. drag="x" → вертикальный скролл страницы сохраняется.
function DragWrap({ children }) {
  const x = useMotionValue(0)
  const rotateY = useTransform(x, [-160, 160], [-16, 16])
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.22}
      dragSnapToOrigin
      whileTap={{ scale: 1.02 }}
      style={{ x, rotateY }}
      className="cursor-grab touch-pan-y will-change-transform active:cursor-grabbing"
    >
      {children}
    </motion.div>
  )
}

const CARDS = [
  {
    n: '01 · СТАРТ',
    title: 'Точка тишины',
    sub: 'Расслабление',
    text: '3 практики, доступные сразу и навсегда бесплатно. Чтобы выдохнуть и вернуться в тело за пару минут.',
    rotY: -14,
    badge: 'Бесплатно · 3',
    from: -60,
  },
  {
    n: '02 · СИСТЕМА',
    title: 'Архитектура состояний',
    sub: 'Осознанность',
    text: 'Курс из 6 практик, которые открываются по одной — мягким ритмом, без спешки. Каждая следующая глубже предыдущей.',
    rotY: 14,
    badge: 'По подписке · 6/мес',
    from: 60,
  },
  {
    n: '03 · ГЛУБИНА',
    title: 'Поток из пространства',
    sub: 'Авторские',
    text: 'Особые сессии с авторским голосом и звуком. Для тех вечеров, когда хочется уйти глубже обычного.',
    rotY: -14,
    badge: 'Авторские',
    from: -60,
  },
]

export default function Inside() {
  return (
    <Section id="inside">
      <MouseFloat strength={12}>
        <Reveal className="mb-16 text-center">
          <Eyebrow className="mb-4">Что внутри</Eyebrow>
          <h2 className="font-display text-4xl font-extralight sm:text-5xl">
            Три пространства
          </h2>
        </Reveal>
      </MouseFloat>

      <div className="mx-auto flex max-w-2xl flex-col gap-10" style={{ perspective: 1200 }}>
        {CARDS.map((c, i) => (
          <motion.div
            key={c.n}
            initial={{ opacity: 0, x: c.from, y: 50, rotateX: 14, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 }}
            viewport={{ once: true, margin: '-12% 0px' }}
            transition={{ duration: 1, ease: EASE, delay: i * 0.14 }}
          >
            {/* лёгкая idle-левитация после появления */}
            <motion.div
              animate={{ y: [0, i % 2 ? 7 : -7, 0] }}
              transition={{ duration: 7 + i, ease: 'easeInOut', repeat: Infinity }}
            >
             <DragWrap>
              <TiltCard className="card-practice relative p-8 sm:p-10" baseRotY={c.rotY} baseRotX={5}>
                <div className="liquid-card-glow" />
                <div className="liquid-card-border" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow text-fg-3">{c.n}</p>
                      <h3 className="mt-2 font-display text-3xl font-light text-fg-0">{c.title}</h3>
                      <p className="mono mt-1 text-xs uppercase tracking-[0.18em] text-lilac">{c.sub}</p>
                    </div>
                    <span className="mono shrink-0 rounded-full border border-line px-3 py-1 text-[11px] text-fg-2">
                      {c.badge}
                    </span>
                  </div>
                  <div className="my-6 h-px w-12 bg-line" />
                  <p className="max-w-md leading-relaxed text-fg-1">{c.text}</p>
                </div>
              </TiltCard>
             </DragWrap>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
