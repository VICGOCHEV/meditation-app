import { Chapter, Split, StoryItem, Cap, Up } from '../components/story'
import InteractivePlayer from '../components/InteractivePlayer'
import { AppFilm } from '../components/RealUI'

const BLOCKS = [
  { icon: 'smoke', title: 'Живой дым', text: 'Кастомный шейдер на фоне — сцена дышит, а не стоит.' },
  { icon: 'sphere', title: 'Аморфная сфера', text: 'Сфера-«капля» пульсирует в такт практике — якорь для взгляда.' },
  { icon: 'clock', title: 'Тема по времени суток', text: '4 слота с мягким 30-минутным переходом на стыках.' },
  { icon: 'play', title: 'Видео-заставки', text: 'Тонированы под каждый слот — ноль мигания при старте.' },
  { icon: 'settings', title: 'Ручная фиксация', text: 'Автоматика как удобство, а не диктат.' },
]

const SLOTS = [
  { name: 'УТРО', desc: 'теплый коралл', slot: 'morning' },
  { name: 'ДЕНЬ', desc: 'фирменный фиолет', slot: 'day' },
  { name: 'ВЕЧЕР', desc: 'изумрудный', slot: 'evening' },
  { name: 'НОЧЬ', desc: 'глубокий индиго', slot: 'night' },
]

export default function Atmosphere() {
  return (
    <Chapter
      id="atmosphere"
      kicker="Атмосфера"
      title="Атмосфера и иммерсивный («живой») UI"
      intro="Интерфейс не статичный. Он живет, дышит, реагирует на время суток и создает состояние."
    >
      <Split visual={<InteractivePlayer size={300} />} reverse>
        <div className="space-y-10">
          {BLOCKS.map((b, i) => (
            <StoryItem key={i} icon={b.icon} title={b.title} index={`0${i + 1}`} delay={(i % 3) * 0.06}>
              <Cap size="sm">{b.text}</Cap>
            </StoryItem>
          ))}
        </div>
      </Split>

      {/* Реальные видео-заставки приложения — тонированы под каждый слот суток */}
      <Up delay={0.1}>
        <div className="mt-24">
          <div className="mb-7 flex items-end justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-lilac">Сетка временных слотов</p>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3 sm:block">реальные видео-заставки из приложения</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SLOTS.map((s) => (
              <div key={s.name} className="group relative aspect-[3/4] overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(180,160,255,0.14)' }}>
                <AppFilm slot={s.slot} rounded="0" className="transition-transform duration-700 group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 48%, rgba(8,6,16,0.88))' }} />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-fg-0">{s.name}</p>
                  <p className="mt-0.5 text-[13px] text-fg-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Up>
    </Chapter>
  )
}
