import { monthGrid, todayISO } from '../lib/dateHelpers'

/* ─────────────────────────────────────────────────────────────
   Реальные элементы приложения — не выдуманные экраны.
   Видео-заставки и календарь-трекер взяты 1:1 из боевой аппки.
   ───────────────────────────────────────────────────────────── */

const SLOT_SRC = {
  morning: '/preloaders/morning.mp4',
  day: '/preloaders/day.mp4',
  evening: '/preloaders/evening.mp4',
  night: '/preloaders/night.mp4',
}

// Настоящая видео-заставка приложения (тонирована под слот суток).
export function AppFilm({ slot = 'evening', className = '', rounded = '24px' }) {
  return (
    <video
      src={SLOT_SRC[slot]}
      className={`h-full w-full object-cover ${className}`}
      style={{ borderRadius: rounded }}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
    />
  )
}

// Настоящий календарь-трекер (TrackerCalendar) — разметка 1:1 из аппки.
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export function TrackerCalendar({ trackerDays = [], streak = 12 }) {
  const now = new Date()
  const days = monthGrid(now.getFullYear(), now.getMonth())
  const done = new Set(trackerDays.map((d) => d.slice(0, 10)))
  const today = todayISO()

  return (
    <div className="panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-light text-fg-0">{MONTHS[now.getMonth()]} {now.getFullYear()}</h3>
        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            style={{ background: 'oklch(0.78 0.14 60 / 0.12)', borderColor: 'oklch(0.78 0.14 60 / 0.3)', color: 'oklch(0.78 0.14 60)' }}>
            {streak} дн. подряд
          </div>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {DOW.map((d) => (
          <div key={d} className="pb-2 pt-1 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-fg-4">{d}</div>
        ))}
        {days.map(({ iso, day, inMonth }) => {
          const isDone = done.has(iso)
          const isToday = iso === today
          return (
            <div
              key={iso}
              className={['relative flex aspect-square items-center justify-center rounded-lg text-[13px]', inMonth ? 'text-fg-2' : 'text-fg-4', isToday && !isDone ? 'border border-lilac text-fg-0' : ''].join(' ')}
              style={isDone ? { background: 'linear-gradient(135deg, oklch(0.50 0.2 290), oklch(0.65 0.17 310))', color: '#fff', boxShadow: '0 4px 20px -4px oklch(0.55 0.2 290 / 0.55)' } : undefined}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Генерируем «прошедшие» дни для демонстрации трекера.
export function demoTrackerDays(count = 16) {
  const out = []
  const cursor = new Date()
  let added = 0
  for (let i = 0; i < 40 && added < count; i++) {
    if (i % 7 !== 5 && i % 11 !== 3) {
      out.push(new Date(cursor).toISOString().slice(0, 10))
      added++
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return out
}
