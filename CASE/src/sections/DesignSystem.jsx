import { motion } from 'framer-motion'
import { Chapter, Up, StoryItem, Cap } from '../components/story'
import CountUp from '../components/CountUp'

const PALETTE = [
  { name: 'Канва', hex: '#0a0714' },
  { name: 'Карточки', hex: '#181330' },
  { name: 'Акцент', hex: '#6145c2' },
  { name: 'Лиловый', hex: '#b9a7f0' },
  { name: 'Текст', hex: '#f4f0ff' },
]

const POINTS = [
  { icon: 'moon', title: 'Палитра «ночного неба»', text: '4 тёмных оттенка фона и 5 градаций белого. Комфорт глазам в полной темноте перед сном.' },
  { icon: 'droplet', title: 'Один акцент', text: 'Единственный фиолетовый #6145c2 связывает все экраны в монолитный продукт.' },
  { icon: 'type', title: 'Две гарнитуры', text: 'Manrope — для текста, JetBrains Mono — для цифр и технических меток.' },
  { icon: 'tokens', title: 'Дизайн-токены', text: 'Цвета, радиусы, тени, отступы зафиксированы. Новый экран собирается за минуты.' },
  { icon: 'pen', title: 'Иконки вручную', text: 'Инлайновый SVG в единой толщине. Ноль сторонних библиотек, ноль лишнего веса.' },
]

export default function DesignSystem() {
  return (
    <Chapter id="design-system" kicker="Дизайн-система" title="Дизайн-система — единый код продукта">
      <Up>
        <div className="overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(180,160,255,0.12)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-5">
            {PALETTE.map((p, i) => (
              <motion.div
                key={p.name}
                className="relative flex aspect-[4/5] flex-col justify-end p-4 sm:aspect-[3/5] sm:p-5"
                style={{ background: p.hex }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: p.name === 'Текст' || p.name === 'Лиловый' ? '#0a0714' : '#f4f0ff' }}>{p.name}</span>
                <span className="mt-1 font-mono text-[12px]" style={{ color: p.name === 'Текст' || p.name === 'Лиловый' ? 'rgba(10,7,20,0.7)' : 'rgba(244,240,255,0.6)' }}>{p.hex}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Up>

      <Up delay={0.1}>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="case-card p-8">
            <p className="label-mono mb-6">Manrope · интерфейс</p>
            <p className="text-[56px] font-extralight leading-none text-fg-0">Тишина</p>
            <p className="mt-4 text-[18px] font-light text-fg-1">Осознанная интерпретация состояния</p>
          </div>
          <div className="case-card p-8">
            <p className="label-mono mb-6">JetBrains Mono · метрики</p>
            <p className="font-mono text-[56px] leading-none text-lilac"><CountUp to={31} /><span className="text-fg-3">/40</span></p>
            <p className="mt-4 font-mono text-[16px] text-fg-1"><CountUp to={1.4} decimals={1} prefix="+" /> · 14:40 · ИНДЕКС СОСТОЯНИЯ</p>
          </div>
        </div>
      </Up>

      <div className="mt-24 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {POINTS.map((p, i) => (
          <StoryItem key={i} icon={p.icon} title={p.title} delay={(i % 3) * 0.06}>
            <Cap size="sm">{p.text}</Cap>
          </StoryItem>
        ))}
      </div>
    </Chapter>
  )
}
