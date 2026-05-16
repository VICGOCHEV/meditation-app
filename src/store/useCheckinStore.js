import { create } from 'zustand'
import { calcIS } from '../utils/scoreCalc'
import { isToday } from '../utils/dateHelpers'
import { api, USE_MOCK } from '../api/client'

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

  // Optimistic local write + server persist. Returns IS for the result
  // screen. In USE_MOCK mode the server call is skipped.
  completeCheckin: async ({ q1, q2, q3, q4 }) => {
    const IS = calcIS(q1, q2, q3, q4)
    const lastCheckinDate = new Date().toISOString()
    const next = { lastCheckinDate, lastIS: IS }
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ ...next, todayCheckinDone: true })

    if (!USE_MOCK) {
      try {
        await api.post('/checkin', { q1, q2, q3, q4 })
      } catch {
        /* server unavailable — local state already updated */
      }
    }
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
