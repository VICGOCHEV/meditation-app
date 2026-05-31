import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

const items = [
  { to: '/', label: 'Главная', icon: HomeIcon, end: true },
  { to: '/profile', label: 'Профиль', icon: ProfileIcon, end: false },
]

const PILL_ID = 'bottomnav-active-pill'
const GLOW_ID = 'bottomnav-active-glow'

export default function BottomNav() {
  const { pathname } = useLocation()
  const isActive = (it) => (it.end ? pathname === it.to : pathname.startsWith(it.to))

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div
        className="pointer-events-auto mx-4 mb-4 flex w-full max-w-md items-center justify-around rounded-full bg-bg-1/80 px-2 py-2 backdrop-blur-lg"
        style={{
          border: '1px solid rgba(180,160,255,.22)',
          boxShadow:
            '0 0 28px -6px rgba(97,69,194,.45), inset 0 0 18px rgba(97,69,194,.08)',
        }}
      >
        {items.map(({ to, label, icon: Icon, end }) => {
          const active = end ? pathname === to : pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors ${
                active ? 'text-lilac' : 'text-lilac/70 hover:text-lilac'
              }`}
            >
              {active && (
                <>
                  {/* Soft outer glow that drifts with the pill */}
                  <motion.span
                    layoutId={GLOW_ID}
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-2 -z-10 rounded-full"
                    style={{
                      background:
                        'radial-gradient(60% 80% at 30% 50%, rgba(97,69,194,.55), transparent 70%)',
                      filter: 'blur(10px)',
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
                  />
                  {/* Gradient pill — same as the GradientMenu accent */}
                  <motion.span
                    layoutId={PILL_ID}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, #6145c2 0%, rgba(97,69,194,.55) 60%, rgba(97,69,194,0) 100%)',
                      boxShadow:
                        '0 0 22px -2px rgba(97,69,194,.7), inset 0 0 14px rgba(97,69,194,.4)',
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
                  />
                </>
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                <Icon />
                <span>{label}</span>
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
