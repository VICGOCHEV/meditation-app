import { motion } from 'framer-motion'
import { Sec, Title, Lead } from '../components/caseui'
import TiltCard from '../components/TiltCard'

const EASE = [0.22, 0.8, 0.36, 1]

// Изометрические плашки — тот же приём, что в секции «Что внутри» на лендинге:
// TiltCard (3D-наклон за курсором) + card-practice + жидкое свечение и обводка.
const CARDS = [
  { n: '01 · ИНСАЙТ', title: 'Человек приходит не за функцией', text: 'А за состоянием. За тем, чтобы выдохнуть и вернуться к себе — продукт должен давать состояние, а не фичи.', rotY: -14, from: -60 },
  { n: '02 · ПРОБЛЕМА', title: 'Каталог аудио не создаёт состояние', text: 'Список файлов — это полка. Состояние рождают атмосфера, ритм и контекст вокруг практики.', rotY: 14, from: 60 },
  { n: '03 · ПРИНЦИП', title: 'Интерфейс должен вести мягко', text: 'Не нагружать выбором, а аккуратно подсказывать следующий шаг — по одному, без спешки.', rotY: -14, from: -60 },
]

export default function Problem() {
  return (
    <Sec id="problem" num="03" tag="Задача / проблема" ghost="03">
      <div className="mx-auto max-w-2xl text-center">
        <Title className="text-[clamp(2rem,5vw,3.4rem)]">Задача и проблема</Title>
        <Lead className="mx-auto mt-6">
          Три принципа, зафиксированные до первых экранов — почему обычный «плеер медитаций» не работает.
        </Lead>
      </div>

      <div className="mx-auto mt-16 flex max-w-2xl flex-col gap-10" style={{ perspective: 1200 }}>
        {CARDS.map((c, i) => (
          <motion.div
            key={c.n}
            initial={{ opacity: 0, x: c.from, y: 50, rotateX: 14, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 }}
            viewport={{ once: true, margin: '-12% 0px' }}
            transition={{ duration: 1, ease: EASE, delay: i * 0.14 }}
          >
            <motion.div animate={{ y: [0, i % 2 ? 7 : -7, 0] }} transition={{ duration: 7 + i, ease: 'easeInOut', repeat: Infinity }}>
              <TiltCard className="card-practice relative p-8 sm:p-10" baseRotY={c.rotY} baseRotX={5}>
                <div className="liquid-card-glow" />
                <div className="liquid-card-border" />
                <div className="relative z-10">
                  <p className="eyebrow text-fg-3">{c.n}</p>
                  <h3 className="mt-3 font-display text-[1.7rem] font-light leading-tight text-fg-0 sm:text-3xl">{c.title}</h3>
                  <div className="my-6 h-px w-12 bg-line" />
                  <p className="max-w-md leading-relaxed text-fg-1">{c.text}</p>
                </div>
              </TiltCard>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Sec>
  )
}
