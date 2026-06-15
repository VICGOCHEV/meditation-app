import { create } from 'zustand'
import { calcIS } from '../utils/scoreCalc'
import { isToday } from '../utils/dateHelpers'
import { api, USE_MOCK } from '../api/client'
import { CHECKIN_PENDING_KEY, clearCheckinPending } from './pendingSyncKeys'

const KEY = 'checkin_state'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

const loadPending = () => {
  try {
    return JSON.parse(localStorage.getItem(CHECKIN_PENDING_KEY)) || []
  } catch {
    return []
  }
}

const persisted = load()

export const useCheckinStore = create((set, get) => ({
  lastCheckinDate: persisted.lastCheckinDate || null,
  todayCheckinDone: isToday(persisted.lastCheckinDate),
  lastIS: persisted.lastIS ?? null,

  // Optimistic local write + server persist. Returns IS for the result
  // screen. В USE_MOCK сервер не дёргаем. При сбое сети — кладём в очередь
  // pending-sync (см. flushPendingSync ниже), чтобы запись не потерялась.
  completeCheckin: async ({ q1, q2, q3, q4 }) => {
    const IS = calcIS(q1, q2, q3, q4)
    const lastCheckinDate = new Date().toISOString()
    const next = { lastCheckinDate, lastIS: IS }
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ ...next, todayCheckinDone: true })

    if (!USE_MOCK) {
      try {
        await api.post('/checkin', { q1, q2, q3, q4 })
      } catch (e) {
        // Сетевая ошибка / 5xx — не теряем запись, кладём в очередь.
        // При следующей загрузке аппки (или вручную flushPendingSync)
        // — отправим снова.
        const pending = loadPending()
        pending.push({ q1, q2, q3, q4, at: lastCheckinDate })
        localStorage.setItem(CHECKIN_PENDING_KEY, JSON.stringify(pending))
        // eslint-disable-next-line no-console
        console.warn('checkin pending sync', e?.message || e)
      }
    }
    return IS
  },

  // Попытка отправить все pending checkin'ы. Вызывается из App.jsx на mount
  // (а также можно дёргать после восстановления связи).
  flushPendingSync: async () => {
    if (USE_MOCK) return
    const pending = loadPending()
    if (!pending.length) return
    const remaining = []
    for (const item of pending) {
      try {
        await api.post('/checkin', {
          q1: item.q1, q2: item.q2, q3: item.q3, q4: item.q4,
        })
      } catch {
        remaining.push(item)
      }
    }
    localStorage.setItem(CHECKIN_PENDING_KEY, JSON.stringify(remaining))
  },

  checkIfDoneToday: () => {
    const done = isToday(get().lastCheckinDate)
    set({ todayCheckinDone: done })
    return done
  },

  reset: () => {
    localStorage.removeItem(KEY)
    clearCheckinPending()
    set({ lastCheckinDate: null, todayCheckinDone: false, lastIS: null })
  },
}))
