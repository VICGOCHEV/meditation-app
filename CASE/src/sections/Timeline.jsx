import { useState } from 'react'
import { Chapter } from '../components/story'
import Icon from '../lib/icons'

const STAGES = [
  { n: '01', title: 'Дизайн-система', icon: 'tokens' },
  { n: '02', title: 'Атмосфера и живой UI', icon: 'smoke' },
  { n: '03', title: 'Интерфейсные сценарии', icon: 'platforms' },
  { n: '04', title: 'Диагностика и замер состояний', icon: 'pulse' },
  { n: '05', title: 'Логика прогресса', icon: 'lock' },
  { n: '06', title: 'Backend', icon: 'server' },
  { n: '07', title: 'Платежи', icon: 'card' },
  { n: '08', title: 'CMS', icon: 'database' },
  { n: '09', title: 'Коммуникации', icon: 'telegram' },
  { n: '10', title: 'Лендинг', icon: 'spark' },
  { n: '11', title: 'DevOps', icon: 'terminal' },
]

export default function Timeline() {
  const [active, setActive] = useState(0)
  return (
    <Chapter
      id="timeline"
      index="02"
      kicker="Хронология производства"
      title="Инженерная и дизайн-реализация: от первого пикселя до сервера"
      intro="Полный путь сборки — от визуального языка и экранов до серверной логики, эквайринга, CMS, уведомлений и деплоя."
    >
      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl sm:grid-cols-2" style={{ background: 'rgba(180,160,255,0.08)' }}>
        {STAGES.map((s, i) => (
          <li
            key={s.n}
            onMouseEnter={() => setActive(i)}
            className="group relative flex items-center gap-5 px-6 py-6 transition-colors sm:py-7"
            style={{ background: active === i ? 'rgba(28,22,56,0.96)' : 'rgba(12,9,24,0.96)' }}
          >
            <span
              className="ghost-num text-[40px] transition-all sm:text-[52px]"
              style={{ WebkitTextStroke: active === i ? '1px rgba(180,160,255,0.55)' : '1px rgba(180,160,255,0.16)' }}
            >
              {s.n}
            </span>
            <span className={`transition-colors ${active === i ? 'text-lilac' : 'text-fg-3'}`}>
              <Icon name={s.icon} size={22} />
            </span>
            <span className={`text-[16px] font-light transition-colors sm:text-[18px] ${active === i ? 'text-fg-0' : 'text-fg-2'}`}>
              {s.title}
            </span>
            <span
              className="absolute bottom-0 left-0 h-px origin-left transition-transform duration-500"
              style={{ width: '100%', background: 'linear-gradient(90deg,#6145c2,transparent)', transform: active === i ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </li>
        ))}
      </ol>
    </Chapter>
  )
}
