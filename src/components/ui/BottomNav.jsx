import { NavLink } from 'react-router-dom'

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

export default function BottomNav() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="pointer-events-auto mx-4 mb-4 flex w-full max-w-md items-center justify-around rounded-full border border-line-2 bg-bg-1/80 px-2 py-2 backdrop-blur-lg shadow-shadow-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition',
                isActive ? 'bg-white/10 text-fg-0' : 'text-fg-2 hover:text-fg-0',
              ].join(' ')
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
