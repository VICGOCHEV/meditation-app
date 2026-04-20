import { create } from 'zustand'
import { calcIS } from '../utils/scoreCalc'
import { isToday } from '../utils/dateHelpers'

const KEY = 'checkin_state'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

const persisted = load()

export const useCheckinStore = create((set, get) => ({
  lastCheckinDate: persisted.lastCheckinDate || null,
  todayCheckinDone: isToday(persisted.lastCheckinDate),
  lastIS: persisted.lastIS ?? null,

  completeCheckin: ({ q1, q2, q3, q4 }) => {
    const IS = calcIS(q1, q2, q3, q4)
    const lastCheckinDate = new Date().toISOString()
    const next = { lastCheckinDate, lastIS: IS }
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ ...next, todayCheckinDone: true })
    return IS
  },

  checkIfDoneToday: () => {
    const done = isToday(get().lastCheckinDate)
    set({ todayCheckinDone: done })
    return done
  },

  reset: () => {
    localStorage.removeItem(KEY)
    set({ lastCheckinDate: null, todayCheckinDone: false, lastIS: null })
  },
}))
