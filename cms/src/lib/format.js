export function fmtClock(sec) {
  if (!sec && sec !== 0) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtMinutes(sec) {
  if (!sec) return '—'
  return `${Math.round(sec / 60)} мин`
}

export function fmtBytes(b) {
  if (!b) return '—'
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} КБ`
  return `${(b / 1024 / 1024).toFixed(1)} МБ`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const BLOCKS = [
  { key: 'relaxation', title: 'Расслабление', note: 'free' },
  { key: 'awareness', title: 'Осознанность', note: 'по подписке' },
  { key: 'author', title: 'Авторский', note: 'поштучно' },
]

export const blockTitle = (k) => BLOCKS.find((b) => b.key === k)?.title || k

export const TIERS = [
  { key: 'awareness', label: 'Осознанность (199 ₽)' },
  { key: 'all-inclusive', label: 'Всё включено (299 ₽)' },
]
