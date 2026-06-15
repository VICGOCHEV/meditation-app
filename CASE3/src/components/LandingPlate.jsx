import TiltCard from './TiltCard'

// Плашка в стиле 3-й секции лендинга (Inside · «Три пространства»):
// card-practice + TiltCard (3D-наклон) + плавающее свечение + вращающаяся
// conic-обводка + шапка (номер / заголовок / подзаголовок / бейдж) + хейрлайн.
export default function LandingPlate({ num, title, sub, badge, children, rotY = -14 }) {
  return (
    <TiltCard className="card-practice relative p-8 sm:p-10" baseRotY={rotY} baseRotX={5} glare={false}>
      <div className="liquid-card-glow" />
      <div className="liquid-card-border" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            {num && <p className="eyebrow text-fg-3">{num}</p>}
            <h3 className="mt-2 font-display text-[1.7rem] font-light leading-tight text-fg-0 sm:text-3xl">{title}</h3>
            {sub && <p className="mono mt-1 text-xs uppercase tracking-[0.18em] text-lilac">{sub}</p>}
          </div>
          {badge && (
            <span className="mono shrink-0 rounded-full border border-line px-3 py-1 text-[11px] text-fg-2">{badge}</span>
          )}
        </div>
        <div className="my-6 h-px w-12 bg-line" />
        <p className="max-w-md leading-relaxed text-fg-1">{children}</p>
      </div>
    </TiltCard>
  )
}
