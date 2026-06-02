import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/store.js'
import {
  IconLayers,
  IconMic,
  IconMusic,
  IconUsers,
  IconLogout,
  IconMessage,
  IconBell,
} from '../ui/icons.jsx'

const NAV = [
  { group: 'Контент', items: [
    { to: '/practices', label: 'Практики', icon: IconLayers },
    { to: '/voices', label: 'Голоса', icon: IconMic },
    { to: '/music', label: 'Музыка', icon: IconMusic },
    { to: '/push-phrases', label: 'Тексты пушей', icon: IconBell },
  ] },
  { group: 'Данные', items: [
    { to: '/users', label: 'Юзеры и подписки', icon: IconUsers },
    { to: '/feedback', label: 'Обратная связь', icon: IconMessage },
  ] },
]

function crumb(pathname) {
  if (pathname.startsWith('/practices/new')) return 'Практики · новая'
  if (pathname.startsWith('/practices/')) return 'Практики · редактор'
  if (pathname.startsWith('/practices')) return 'Практики'
  if (pathname.startsWith('/voices')) return 'Голоса'
  if (pathname.startsWith('/music')) return 'Музыка'
  if (pathname.startsWith('/users')) return 'Юзеры и подписки'
  if (pathname.startsWith('/feedback')) return 'Обратная связь'
  if (pathname.startsWith('/push-phrases')) return 'Тексты пушей'
  return ''
}

export default function Shell({ children }) {
  const { admin, logout } = useAuth()
  const loc = useLocation()

  return (
    <div className="flex min-h-screen">
      {/* ── Сайдбар ── */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-bg-1 px-3 py-5 md:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-btn text-white shadow-btn-primary">◐</span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-fg-0">relaxme</div>
            <div className="text-[11px] text-fg-3">CMS</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-fg-4">
                {g.group}
              </div>
              <div className="flex flex-col gap-0.5">
                {g.items.map((it) => {
                  const Icon = it.icon
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-bg-2 font-semibold text-fg-0'
                            : 'text-fg-2 hover:bg-bg-2/60 hover:text-fg-1'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-violet" />
                          )}
                          <Icon size={17} />
                          {it.label}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-fg-3 transition-colors hover:bg-bg-2 hover:text-fg-1"
        >
          <IconLogout size={17} /> Выйти
        </button>
      </aside>

      {/* ── Контент ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg-1/90 px-5 backdrop-blur">
          <div className="text-sm font-medium text-fg-1">{crumb(loc.pathname)}</div>
          <div className="flex items-center gap-2.5">
            <div className="text-right leading-tight">
              <div className="text-xs font-medium text-fg-1">{admin?.name || admin?.email}</div>
              <div className="text-[10px] text-fg-4">{admin?.role === 'admin' ? 'администратор' : 'редактор'}</div>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-3 text-xs font-bold text-fg-1">
              {(admin?.name || admin?.email || '?')[0]?.toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  )
}
