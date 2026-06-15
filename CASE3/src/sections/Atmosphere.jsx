import { AppFilm } from '../components/RealUI'
import { Up } from '../components/story'

const SLOTS = [
  { name: 'УТРО', desc: 'теплый коралл', slot: 'morning' },
  { name: 'ДЕНЬ', desc: 'фирменный фиолет', slot: 'day' },
  { name: 'ВЕЧЕР', desc: 'изумрудный', slot: 'evening' },
  { name: 'НОЧЬ', desc: 'глубокий индиго', slot: 'night' },
]

// Сетка временных слотов — реальные видео-заставки приложения, тонированные
// под каждое время суток. (Глава «Атмосфера и иммерсивный UI» убрана,
// оставлен только этот грид.)
export default function Atmosphere() {
  return (
    <section id="atmosphere" className="relative mx-auto w-full max-w-[1100px] px-5 py-24 sm:py-32">
      <Up delay={0.1}>
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
      </Up>
    </section>
  )
}
