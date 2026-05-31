import { useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'

// Hue rotations applied to the WHOLE app via CSS `filter: hue-rotate()`
// on <html>. Numbers are degrees added to the base violet palette.
//   morning — тёплый коралл (закат-красный)
//   day     — базовый фиолетовый (без сдвига)
//   evening — изумрудно-зелёный
//   night   — глубокий индиго / тёмно-синий
const SLOT_HUE = {
  morning: 110,
  day: 0,
  evening: 225,
  night: 315,
}

// 30-минутный crossfade, центрированный на границе слота.
// Между 04:45 и 05:15 хью плавно едет от night к morning, и т.д.
const FADE_MIN = 30

// Шорт-патчем интерполируем хью по кратчайшему пути на круге (0..360).
// Иначе переход night→morning (315→110) пошёл бы через 200° вместо 155°.
function lerpHue(from, to, t) {
  const diff = ((to - from + 540) % 360) - 180
  return (from + diff * t + 360) % 360
}

function hueForMinute(minOfDay) {
  // boundaries (минута от полуночи): 5h=300, 11h=660, 17h=1020, 22h=1320
  const boundaries = [
    { mid: 300, from: 'night', to: 'morning' },
    { mid: 660, from: 'morning', to: 'day' },
    { mid: 1020, from: 'day', to: 'evening' },
    { mid: 1320, from: 'evening', to: 'night' },
  ]
  const half = FADE_MIN / 2

  for (const b of boundaries) {
    const start = b.mid - half
    const end = b.mid + half
    if (minOfDay >= start && minOfDay < end) {
      const t = (minOfDay - start) / FADE_MIN
      return lerpHue(SLOT_HUE[b.from], SLOT_HUE[b.to], t)
    }
  }

  if (minOfDay < 300 || minOfDay >= 1320) return SLOT_HUE.night
  if (minOfDay < 660) return SLOT_HUE.morning
  if (minOfDay < 1020) return SLOT_HUE.day
  return SLOT_HUE.evening
}

export default function useTimeTheme() {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    if (typeof document === 'undefined') return

    function apply() {
      let hue
      if (mode === 'auto') {
        const now = new Date()
        hue = hueForMinute(now.getHours() * 60 + now.getMinutes())
      } else {
        hue = SLOT_HUE[mode] ?? 0
      }
      document.documentElement.style.setProperty('--app-hue', `${hue}deg`)
    }

    apply()
    // Раз в минуту достаточно — CSS transition 2s сглаживает скачок,
    // и за 30-мин crossfade хью смещается на ~3° в минуту (незаметно).
    const interval = setInterval(apply, 60_000)
    return () => clearInterval(interval)
  }, [mode])
}

// Экспорт для отладки/тестов
export { SLOT_HUE, hueForMinute, lerpHue }
