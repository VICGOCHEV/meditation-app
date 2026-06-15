import { Chapter, StoryItem, Cap, Up } from '../components/story'
import Icon from '../lib/icons'

const VOICES = ['Мужской', 'Женский']
const MUSIC = ['Music · Дождь', 'Music · Хвоя', 'Music · Океан']

function AudioCell({ voice, music }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(14,10,28,0.85)', border: '1px solid rgba(180,160,255,0.08)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-3">{voice}</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-lilac" style={{ background: 'rgba(97,69,194,0.18)' }}><Icon name="play" size={12} /></span>
      </div>
      <p className="mb-2 truncate text-[11px] text-fg-1">{music}</p>
      <div className="flex h-6 items-end gap-[2px]">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="wave-bar flex-1 rounded-full" style={{ height: `${20 + ((i * 37) % 80)}%`, background: 'linear-gradient(180deg,#6145c2,#4a35a0)', animationDelay: `${(i % 6) * 0.12}s` }} />
        ))}
      </div>
    </div>
  )
}

function CmsMockup() {
  return (
    <div className="case-card overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(180,160,255,0.1)', background: 'rgba(8,6,16,0.6)' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-[11px] text-fg-3">all-relaxme.ru/manage</span>
      </div>
      <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[210px_1fr]">
        <div className="hidden flex-col gap-1 p-4 sm:flex" style={{ borderRight: '1px solid rgba(180,160,255,0.08)' }}>
          {[
            { i: 'database', t: 'Практики', a: true }, { i: 'chart', t: 'Дашборд' }, { i: 'tariff', t: 'Подписки' }, { i: 'feedback', t: 'Обращения' }, { i: 'settings', t: 'Настройки' },
          ].map((m) => (
            <span key={m.t} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px]" style={{ background: m.a ? 'rgba(97,69,194,0.16)' : 'transparent', color: m.a ? '#f4f0ff' : '#a99ecb' }}>
              <Icon name={m.i} size={15} /> {m.t}
            </span>
          ))}
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[16px] font-light text-fg-0">День 04 · Наблюдатель</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">Матрица аудио · 2 × 3</p>
            </div>
            <span className="btn-primary-app px-3.5 py-2 text-[11px]"><Icon name="layers" size={13} className="text-white" /> Добавить практику</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {VOICES.map((v) => MUSIC.map((m) => <AudioCell key={v + m} voice={v} music={m} />))}
          </div>
        </div>
      </div>
    </div>
  )
}

const BLOCKS = [
  { icon: 'droplet', title: 'Визуальный код приложения', text: 'Тёмная тема и фирменная типографика — но строго, плоско и быстро.' },
  { icon: 'tokens', title: 'Матрица аудио 2×3', text: 'Голоса (М/Ж) × 3 музыки. Каждая ячейка — встроенный плеер превью.' },
  { icon: 'layers', title: 'Добавить практику', text: 'Полный пак полей в один клик — от 1 до 20 практик без кода.' },
  { icon: 'chart', title: 'Read-only дашборд', text: 'Активность, подписки, замеры и ручная модерация доступов.' },
  { icon: 'database', title: 'Миграция данных', text: 'Прогресс пользователей перенесён со Strapi незаметно и без потерь.' },
]

export default function Cms() {
  return (
    <Chapter
      id="cms"
      kicker="Собственная CMS"
      title="Кастомная CMS вместо Strapi"
      intro="Strapi отклонили — перегружен и неудобен в наполнении. Сделали свою панель под контент именно этого приложения."
    >
      <Up><CmsMockup /></Up>

      <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {BLOCKS.map((b, i) => (
          <StoryItem key={b.title} icon={b.icon} title={b.title} index={`0${i + 1}`} delay={(i % 3) * 0.06}>
            <Cap size="sm">{b.text}</Cap>
          </StoryItem>
        ))}
      </div>
    </Chapter>
  )
}
