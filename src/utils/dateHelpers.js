const DAY = 24 * 60 * 60 * 1000

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function isToday(dateString) {
  if (!dateString) return false
  return dateString.slice(0, 10) === todayISO()
}

export function daysSince(dateString) {
  if (!dateString) return Infinity
  const diff = Date.now() - new Date(dateString).getTime()
  return Math.floor(diff / DAY)
}

export function daysUntil(dateString) {
  if (!dateString) return 0
  const diff = new Date(dateString).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / DAY))
}

export function canDoDeepAnalysis(lastDate) {
  return !lastDate || daysSince(lastDate) >= 3
}

export function formatRuDate(dateString) {
  if (!dateString) return ''
  const months = [
    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ]
  const d = new Date(dateString)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function consecutiveStreak(dates) {
  if (!dates?.length) return 0
  const set = new Set(dates.map(d => d.slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  const dow = (first.getDay() + 6) % 7
  start.setDate(first.getDate() - dow)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({
      iso: d.toISOString().slice(0, 10),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    })
  }
  return days
}
