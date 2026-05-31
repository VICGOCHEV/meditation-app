import { motion } from 'framer-motion'
import { Section, Reveal, Eyebrow } from '../components/primitives'
import TiltCard from '../components/TiltCard'
import ShinyButton from '../components/ShinyButton'
import MouseFloat from '../components/MouseFloat'

const EASE = [0.22, 0.8, 0.36, 1]
const FEATURES = [
  'Курс осознанности — 6 практик каждый месяц',
  'Ежедневный чек-ин и трекер состояния',
  'Глубокий анализ на контрольных точках',
  'Выбор голоса и музыкального фона',
]

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }
const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

export default function Tariff() {
  return (
    <Section id="tariff" narrow>
      <MouseFloat strength={10}>
        <Reveal className="mb-14 text-center">
          <Eyebrow className="mb-4">Тариф</Eyebrow>
          <h2 className="font-display text-4xl font-extralight sm:text-5xl">Ключи к жизни</h2>
          <p className="mx-auto mt-4 max-w-md text-fg-2">
            Первые 7 дней — бесплатно. Дальше — меньше чашки кофе в неделю.
          </p>
        </Reveal>
      </MouseFloat>

      <div className="flex justify-center" style={{ perspective: 1300 }}>
        <motion.div
          initial={{ opacity: 0, y: 70, rotateX: 16, scale: 0.92 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 1.1, ease: EASE }}
          className="w-full max-w-md"
        >
          <TiltCard className="glass-panel relative p-9 sm:p-11" baseRotY={-10} baseRotX={6}>
            <div
              className="pointer-events-none absolute -inset-10 -z-10"
              style={{ background: 'radial-gradient(50% 50% at 50% 40%, rgba(97,69,194,0.4), transparent 70%)', filter: 'blur(30px)' }}
            />
            {/* контент со стаггером */}
            <motion.div
              className="relative z-10 text-center"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-10% 0px' }}
            >
              <motion.p variants={item} className="mono text-xs uppercase tracking-[0.18em] text-lilac">Осознанность</motion.p>
              <motion.div variants={item} className="mt-5 flex items-end justify-center gap-2">
                <span className="font-display text-6xl font-extralight text-fg-0">199</span>
                <span className="mb-2 text-fg-3">₽ / мес</span>
              </motion.div>
              <motion.p variants={item} className="mt-2 text-sm text-fg-3">7 дней бесплатно · отмена в один тап</motion.p>
              <motion.div variants={item} className="my-7 h-px w-full bg-line" />
              <ul className="space-y-3 text-left">
                {FEATURES.map((f) => (
                  <motion.li key={f} variants={item} className="flex items-start gap-3 text-fg-1">
                    <span className="mt-1 text-lilac">✦</span>
                    <span className="leading-snug">{f}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.div variants={item} className="mt-9 flex justify-center">
                <ShinyButton as="a" href="#final">Получить ключи к жизни</ShinyButton>
              </motion.div>
              <motion.p variants={item} className="mt-5 text-xs text-fg-4">
                Нужны все авторские практики? Тариф «Всё включено» — 299 ₽/мес.
              </motion.p>
            </motion.div>
          </TiltCard>
        </motion.div>
      </div>
    </Section>
  )
}
