import { create } from 'zustand'

// Per-user override for the time-of-day theme.
//   'auto'    — поворот хью считается из текущего локального времени
//   'morning' — закреплено: коралл (05-11)
//   'day'     — закреплено: фиолетовый (11-17, базовая палитра)
//   'evening' — закреплено: зелёный (17-22)
//   'night'   — закреплено: индиго (22-05)
// Сохраняется в localStorage, доступно через Profile → Тема.

const KEY = 'theme_mode'
const VALID = ['auto', 'morning', 'day', 'evening', 'night']

function loadInitial() {
  if (typeof window === 'undefined') return 'auto'
  try {
    const v = window.localStorage.getItem(KEY)
    return VALID.includes(v) ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export const useThemeStore = create((set) => ({
  mode: loadInitial(),
  setMode: (m) => {
    if (!VALID.includes(m)) return
    try {
      window.localStorage.setItem(KEY, m)
    } catch {
      /* ignore quota / private mode */
    }
    set({ mode: m })
  },
}))

export const THEME_MODES = VALID
