// Единый источник правды по фазам дня для пуш-уведомлений «начало практики».
// Используется и notifier'ом (когда слать), и admin-роутом (валидация фраз).
//
// Каждая фаза = ключ + час отправки (минута всегда :00) в таймзоне юзера.
// Время фаз можно переопределить через env (PUSH_MORNING_HOUR и т.д.), но
// по умолчанию: утро 09:00, день 14:00, вечер 20:00.

export const PHASES = [
  { key: 'morning', label: 'утро',  hour: Number(process.env.PUSH_MORNING_HOUR) || 9 },
  { key: 'day',     label: 'день',  hour: Number(process.env.PUSH_DAY_HOUR) || 14 },
  { key: 'evening', label: 'вечер', hour: Number(process.env.PUSH_EVENING_HOUR) || 20 },
]

export const PHASE_KEYS = PHASES.map((p) => p.key)

// Парсит comma-join строку "morning,evening" в массив валидных ключей.
export function parsePhases(str) {
  if (!str) return []
  return String(str)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => PHASE_KEYS.includes(s))
}

// Нормализует массив ключей в comma-join строку (уникальные, в порядке PHASES).
export function serializePhases(arr) {
  const set = new Set((arr || []).filter((s) => PHASE_KEYS.includes(s)))
  return PHASE_KEYS.filter((k) => set.has(k)).join(',')
}
