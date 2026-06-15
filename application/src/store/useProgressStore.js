import { create } from 'zustand'
import { todayISO } from '../utils/dateHelpers'
import { api, USE_MOCK } from '../api/client'
import { fetchProgress, completePractice as apiCompletePractice } from '../api/progress'
import { COMPLETION_PENDING_KEY, clearCompletionPending } from './pendingSyncKeys'

const KEY = 'progress_state'

const AWARENESS_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
const PROGRESSION_CYCLE_DAYS = 4

const defaults = {
  // tier: 'awareness' (199₽) | 'all-inclusive' (299₽), null если sub неактивна
  subscription: { active: false, autoRenew: false, expiresAt: null, tier: null },
  unlockedPractices: [],
  completedPractices: [],
  trackerDays: [],
  lastDeepAnalysisDate: null,
  lastKT: null,
  ktHistory: [],
  // 'start' | 'mid' | 'final' | null — пришло от сервера.
  daCheckpoint: null,
  // { id, reason, daysLeft? } — что мешает открыть следующую awareness.
  nextAwarenessUnlock: { id: null, reason: 'sub-not-active' },
}

const load = () => {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return defaults
  }
}

const persist = (state) => {
  const snap = {
    subscription: state.subscription,
    unlockedPractices: state.unlockedPractices,
    completedPractices: state.completedPractices,
    trackerDays: state.trackerDays,
    lastDeepAnalysisDate: state.lastDeepAnalysisDate,
    lastKT: state.lastKT,
    ktHistory: state.ktHistory,
    daCheckpoint: state.daCheckpoint,
    nextAwarenessUnlock: state.nextAwarenessUnlock,
  }
  localStorage.setItem(KEY, JSON.stringify(snap))
}

// Mock-mode зеркала серверных progressionRules. Используется только
// при USE_MOCK=true, в проде сервер решает.
function mockDaCheckpoint({ unlockedPractices, completedPractices, ktHistory }) {
  if (!unlockedPractices.length) return null
  const ktCount = ktHistory.length
  if (ktCount === 0) return 'start'
  if (ktCount === 1) {
    return ['a1', 'a2', 'a3'].every((id) => completedPractices.includes(id)) ? 'mid' : null
  }
  if (ktCount === 2) {
    return completedPractices.includes('a6') ? 'final' : null
  }
  return null
}

function mockNextUnlock(state) {
  const unlocked = new Set(state.unlockedPractices)
  const nextIdx = AWARENESS_ORDER.findIndex((id) => !unlocked.has(id))
  if (nextIdx === -1) return { id: null, reason: 'all-unlocked' }
  if (nextIdx === 0) return { id: null, reason: 'sub-not-active' }
  const prevId = AWARENESS_ORDER[nextIdx - 1]
  if (!state.completedPractices.includes(prevId)) {
    return { id: null, reason: 'prev-not-completed' }
  }
  if (nextIdx === 3 && state.ktHistory.length < 2) {
    return { id: null, reason: 'mid-da-required' }
  }
  // Время проверять не будем в моке (нет хранения unlockedAt) — для UI
  // достаточно reason. В проде backend всё считает.
  return { id: AWARENESS_ORDER[nextIdx], reason: 'unlock' }
}

export const useProgressStore = create((set, get) => ({
  ...load(),

  loadFromServer: async () => {
    try {
      const p = await fetchProgress()
      if (!p) return null
      set(p)
      persist({ ...get(), ...p })
      return p
    } catch {
      return null
    }
  },

  activateSubscription: async (days = 30, tier = 'awareness') => {
    if (USE_MOCK) {
      const expires = new Date()
      expires.setDate(expires.getDate() + days)
      const unlockedPractices = Array.from(new Set([...get().unlockedPractices, 'a1']))
      const sub = {
        active: true,
        autoRenew: true,
        expiresAt: expires.toISOString(),
        tier,
      }
      const next = {
        subscription: sub,
        unlockedPractices,
        daCheckpoint: mockDaCheckpoint({
          unlockedPractices,
          completedPractices: get().completedPractices,
          ktHistory: get().ktHistory,
        }),
      }
      set(next)
      persist({ ...get(), ...next })
      return
    }
    const { data } = await api.post('/subscription', { tier })
    await get().loadFromServer()
    return data
  },

  cancelSubscription: async () => {
    if (USE_MOCK) {
      const next = { subscription: { ...get().subscription, autoRenew: false } }
      set(next)
      persist({ ...get(), ...next })
      return
    }
    await api.delete('/subscription')
    await get().loadFromServer()
  },

  // Mark practice complete + add today to tracker. Сервер сам решит,
  // нужно ли открыть следующую awareness (см. backend/utils/progressionRules).
  markPracticeComplete: async (id) => {
    const { completedPractices, trackerDays } = get()
    const next = {
      completedPractices: completedPractices.includes(id)
        ? completedPractices
        : [...completedPractices, id],
      trackerDays: trackerDays.includes(todayISO())
        ? trackerDays
        : [...trackerDays, todayISO()].sort(),
    }
    set(next)
    persist({ ...get(), ...next })

    if (!USE_MOCK) {
      try {
        await apiCompletePractice(id)
        await get().loadFromServer()
      } catch (e) {
        // Сетевой сбой / 5xx — кладём id в очередь pending sync чтобы
        // прогресс не потерялся. flushPendingCompletions попробует
        // отправить ещё раз при следующем mount'е App.
        try {
          const raw = localStorage.getItem(COMPLETION_PENDING_KEY)
          const arr = raw ? JSON.parse(raw) : []
          if (!arr.includes(id)) arr.push(id)
          localStorage.setItem(COMPLETION_PENDING_KEY, JSON.stringify(arr))
        } catch { /* ignore */ }
        // eslint-disable-next-line no-console
        console.warn('practice completion pending sync', id, e?.message || e)
      }
    } else {
      // Mock: пересчитать daCheckpoint + nextAwarenessUnlock локально
      const s = get()
      set({
        daCheckpoint: mockDaCheckpoint(s),
        nextAwarenessUnlock: mockNextUnlock(s),
      })
      persist(get())
    }
    return id
  },

  // Попытка дослать pending-completions из localStorage. Вызывается из App.jsx
  // при старте, после возврата связи. В USE_MOCK ничего не делает.
  flushPendingCompletions: async () => {
    if (USE_MOCK) return
    let arr = []
    try {
      arr = JSON.parse(localStorage.getItem(COMPLETION_PENDING_KEY) || '[]')
    } catch { return }
    if (!arr.length) return
    const remaining = []
    for (const id of arr) {
      try {
        await apiCompletePractice(id)
      } catch {
        remaining.push(id)
      }
    }
    localStorage.setItem(COMPLETION_PENDING_KEY, JSON.stringify(remaining))
    if (remaining.length === 0) {
      try { await get().loadFromServer() } catch { /* ignore */ }
    }
  },

  addTrackerDay: (date = todayISO()) => {
    const { trackerDays } = get()
    if (trackerDays.includes(date)) return
    const next = { trackerDays: [...trackerDays, date].sort() }
    set(next)
    persist({ ...get(), ...next })
  },

  // Записывает результат DA. Бизнес-логика unlock'а перенесена в
  // markPracticeComplete (на сервере) — DA больше не открывает awareness.
  recordDeepAnalysis: async ({ answers, IT, IO, KT }) => {
    if (USE_MOCK) {
      const entry = { date: new Date().toISOString(), kt: KT }
      const ktHistory = [...get().ktHistory, entry].slice(-12)
      const after = {
        lastDeepAnalysisDate: entry.date,
        lastKT: KT,
        ktHistory,
      }
      set(after)
      const s = get()
      set({
        daCheckpoint: mockDaCheckpoint(s),
        nextAwarenessUnlock: mockNextUnlock(s),
      })
      persist(get())
      return { ok: true, IT, IO, KT }
    }
    const { data } = await api.post('/deep-analysis', { answers, IT, IO, KT })
    await get().loadFromServer()
    return data
  },

  reset: () => {
    localStorage.removeItem(KEY)
    clearCompletionPending()
    set(defaults)
  },
}))
