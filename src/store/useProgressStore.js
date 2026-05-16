import { create } from 'zustand'
import { todayISO, countWithinLastDays } from '../utils/dateHelpers'
import { api, USE_MOCK } from '../api/client'
import { fetchProgress, completePractice as apiCompletePractice } from '../api/progress'

const KEY = 'progress_state'

const defaults = {
  subscription: { active: false, expiresAt: null },
  unlockedPractices: [],
  completedPractices: [],
  trackerDays: [],
  lastDeepAnalysisDate: null,
  lastKT: null,
  ktHistory: [],
  bonusUnlocked: [],
  bonusProgress: null, // hydrated from server; falls back to local compute when missing
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
    bonusUnlocked: state.bonusUnlocked,
    bonusProgress: state.bonusProgress,
  }
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const awarenessOrder = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']

// Local fallback for bonusProgress when the server hasn't provided one
// (USE_MOCK mode, or before first /api/progress fetch lands).
function computeLocalBonusProgress(state) {
  const window = 30
  const recentKT = (state.ktHistory || []).filter((e) => {
    const ts = new Date(e.date).getTime()
    return Number.isFinite(ts) && ts >= Date.now() - window * 86400000
  })
  const ktSamples = recentKT.length
  const ktAvg = ktSamples
    ? recentKT.reduce((s, e) => s + e.kt, 0) / ktSamples
    : 0
  const trackerCount = countWithinLastDays(state.trackerDays || [], window)
  const ktReq = 2
  const trackerReq = 6
  const eligible =
    ktSamples >= ktReq && ktAvg >= 0.5 && trackerCount >= trackerReq
  return {
    eligible,
    window,
    ktSamples,
    ktReq,
    ktAvg: Number(ktAvg.toFixed(2)),
    trackerCount,
    trackerReq,
  }
}

export const useProgressStore = create((set, get) => ({
  ...load(),

  // Pull authoritative state from the server. Called after auth (login
  // success or session restore). Returns null on 401 — caller can stay
  // on LS-only mode.
  loadFromServer: async () => {
    try {
      const p = await fetchProgress()
      if (!p) return null
      set(p)
      persist({ ...get(), ...p })
      return p
    } catch (e) {
      // network error — stay on local state
      return null
    }
  },

  activateSubscription: async (days = 30) => {
    if (USE_MOCK) {
      const expires = new Date()
      expires.setDate(expires.getDate() + days)
      const unlockedPractices = Array.from(new Set([...get().unlockedPractices, 'a1']))
      const next = {
        subscription: { active: true, expiresAt: expires.toISOString() },
        unlockedPractices,
      }
      set(next)
      persist({ ...get(), ...next })
      return
    }
    const { data } = await api.post('/subscription')
    // Refresh the whole snapshot — server may have unlocked a1, etc.
    await get().loadFromServer()
    return data
  },

  cancelSubscription: async () => {
    if (USE_MOCK) {
      const next = { subscription: { ...get().subscription, active: false } }
      set(next)
      persist({ ...get(), ...next })
      return
    }
    await api.delete('/subscription')
    await get().loadFromServer()
  },

  // Mark practice complete + add today to tracker. In real-backend mode
  // both happen on the server in a single endpoint; we then reload.
  // Returns the practice id (for chaining).
  markPracticeComplete: async (id) => {
    // Optimistic local update first so the UI sees the change immediately.
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
      } catch {
        /* network failure — local state already reflects the action */
      }
    }
    return id
  },

  // Kept for compatibility with the older "two-call" flow (Player.onEnd
  // calls markPracticeComplete + addTrackerDay separately). With the
  // server-side endpoint these collapse — addTrackerDay becomes a no-op
  // when called right after markPracticeComplete with the same date.
  addTrackerDay: (date = todayISO()) => {
    const { trackerDays } = get()
    if (trackerDays.includes(date)) return
    const next = { trackerDays: [...trackerDays, date].sort() }
    set(next)
    persist({ ...get(), ...next })
  },

  // Records the new KT entry. In real-backend mode the server does
  // the unlock-next-awareness + bonus-eligibility check too and
  // returns { newlyUnlockedId, newlyUnlockedBonus }. Caller (DeepAnalysis
  // page) reads those from the returned object.
  recordDeepAnalysis: async ({ answers, IT, IO, KT }) => {
    if (USE_MOCK) {
      const entry = { date: new Date().toISOString(), kt: KT }
      const { ktHistory, unlockedPractices, bonusUnlocked } = get()
      const newlyUnlockedId = (() => {
        const idx = awarenessOrder.findIndex((id) => !unlockedPractices.includes(id))
        return idx === -1 ? null : awarenessOrder[idx]
      })()
      const after = {
        lastDeepAnalysisDate: entry.date,
        lastKT: KT,
        ktHistory: [...ktHistory, entry].slice(-12),
        unlockedPractices: newlyUnlockedId
          ? [...unlockedPractices, newlyUnlockedId]
          : unlockedPractices,
      }
      // Local bonus check
      const bp = computeLocalBonusProgress({
        ...get(),
        ...after,
      })
      const newlyUnlockedBonus = []
      if (bp.eligible) {
        for (const id of ['au1', 'au2']) {
          if (!bonusUnlocked.includes(id)) newlyUnlockedBonus.push(id)
        }
      }
      const next = {
        ...after,
        bonusUnlocked: [...bonusUnlocked, ...newlyUnlockedBonus],
        bonusProgress: bp,
      }
      set(next)
      persist({ ...get(), ...next })
      return { ok: true, IT, IO, KT, newlyUnlockedId, newlyUnlockedBonus }
    }
    const { data } = await api.post('/deep-analysis', { answers, IT, IO, KT })
    await get().loadFromServer()
    return data
  },

  // Returns the most recent bonus-progress snapshot. Server pushes
  // it into state on loadFromServer; for USE_MOCK we recompute locally.
  bonusProgress: () => {
    const stored = get().bonusProgress
    if (stored) return stored
    return computeLocalBonusProgress(get())
  },

  checkBonusEligibility: () => get().bonusProgress().eligible,

  // No longer called from the page in real-backend mode — server does
  // the unlock during recordDeepAnalysis. Kept for USE_MOCK fallback.
  unlockNextPractice: () => {
    const { unlockedPractices } = get()
    const nextIdx = awarenessOrder.findIndex((id) => !unlockedPractices.includes(id))
    if (nextIdx === -1) return null
    const id = awarenessOrder[nextIdx]
    const next = { unlockedPractices: [...unlockedPractices, id] }
    set(next)
    persist({ ...get(), ...next })
    return id
  },

  unlockBonus: () => {
    if (!get().checkBonusEligibility()) return []
    const already = new Set(get().bonusUnlocked)
    const bonusIds = ['au1', 'au2']
    const newly = bonusIds.filter((id) => !already.has(id))
    if (!newly.length) return []
    const next = { bonusUnlocked: [...get().bonusUnlocked, ...newly] }
    set(next)
    persist({ ...get(), ...next })
    return newly
  },

  // Local reset (used on logout).
  reset: () => {
    localStorage.removeItem(KEY)
    set(defaults)
  },
}))
