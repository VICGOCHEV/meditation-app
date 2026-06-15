import { Statement, Up, Kicker } from '../components/story'
import { Badge, StackChip } from '../components/kit'
import Icon from '../lib/icons'

const PLATES = [
  { t: 'Работает в продакшне', i: 'globe' },
  { t: 'Автономен для заказчика', i: 'key' },
  { t: 'Масштабируется', i: 'chart' },
  { t: 'Собран под ключ', i: 'check' },
]
const BADGES = ['Web', 'TG', 'VK', 'Backend', 'CMS', 'Payments']
const FRONTEND = ['React', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Three.js (шейдеры)', 'Zustand', 'Howler']
const BACKEND = ['Fastify', 'PostgreSQL', 'Prisma', 'ЮKassa', 'Кастомная CMS', 'Telegram/VK Mini App API', 'Cloudflare', 'Caddy + SSL']

export default function Outcome() {
  return (
    <>
      <section id="outcome" className="relative mx-auto w-full max-w-[1100px] px-5 py-32 sm:py-44">
        <Up className="text-center"><Kicker>Итог</Kicker></Up>
        <Statement>
          Зрелый продукт «под ключ». Каждое решение продиктовано болью пользователя и задачей бизнеса —
          а не технологиями ради технологий.
        </Statement>

        <Up delay={0.1}>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">{BADGES.map((b) => <Badge key={b}>{b}</Badge>)}</div>
        </Up>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLATES.map((p, i) => (
            <Up key={p.t} delay={i * 0.06}>
              <div className="case-card flex flex-col items-center gap-3 p-7 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(97,69,194,0.14)', border: '1px solid rgba(180,160,255,0.18)' }}><Icon name={p.i} size={22} /></span>
                <span className="text-[14px] font-light text-fg-0">{p.t}</span>
              </div>
            </Up>
          ))}
        </div>
      </section>

      <section id="stack" className="relative mx-auto w-full max-w-[1100px] px-5 pb-32">
        <Up><Kicker>Технологии</Kicker></Up>
        <Up><h2 className="mt-6 text-[30px] font-extralight text-fg-0 sm:text-[44px]">Технологический стек</h2></Up>
        <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-2">
          <Up>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(97,69,194,0.14)' }}><Icon name="layers" size={20} /></span>
              <h3 className="text-[22px] font-light text-fg-0">Frontend</h3>
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">{FRONTEND.map((s) => <StackChip key={s}>{s}</StackChip>)}</div>
          </Up>
          <Up delay={0.1}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-lilac" style={{ background: 'rgba(97,69,194,0.14)' }}><Icon name="server" size={20} /></span>
              <h3 className="text-[22px] font-light text-fg-0">Backend &amp; Infrastructure</h3>
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">{BACKEND.map((s) => <StackChip key={s}>{s}</StackChip>)}</div>
          </Up>
        </div>
      </section>
    </>
  )
}
