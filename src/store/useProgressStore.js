import { create } from 'zustand'
import { todayISO, countWithinLastDays } from '../utils/dateHelpers'

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
  }
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const awarenessOrder = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']

export const useProgressStore = create((set, get) => ({
  ...load(),

  activateSubscription: (days = 30) => {
    const expires = new Date()
    expires.setDate(expires.getDate() + days)
    const unlockedPractices = Array.from(new Set([...get().unlockedPractices, 'a1']))
    const next = {
      subscription: { active: true, expiresAt: expires.toISOString() },
      unlockedPractices,
    }
    set(next)
    persist({ ...get(), ...next })
  },

  cancelSubscription: () => {
    const next = { subscription: { ...get().subscription, active: false } }
    set(next)
    persist({ ...get(), ...next })
  },

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

  markPracticeComplete: (id) => {
    const { completedPractices } = get()
    if (completedPractices.includes(id)) return
    const next = { completedPractices: [...completedPractices, id] }
    set(next)
    persist({ ...get(), ...next })
  },

  addTrackerDay: (date = todayISO()) => {
    const { trackerDays } = get()
    if (trackerDays.includes(date)) return
    const next = { trackerDays: [...trackerDays, date].sort() }
    set(next)
    persist({ ...get(), ...next })
  },

  recordDeepAnalysis: (kt) => {
    const { ktHistory } = get()
    const entry = { date: new Date().toISOString(), kt }
    const next = {
      lastDeepAnalysisDate: entry.date,
      lastKT: kt,
      ktHistory: [...ktHistory, entry].slice(-12),
    }
    set(next)
    persist({ ...get(), ...next })
  },

  // Bonus condition (per spec: "Положительная динамика KT в течение месяца
  // вместе с отметками в трекере открывает доступ к 1-2 практикам в
  // 'Авторском' блоке бесплатно"):
  //  · ≥ 2 KT entries in the last 30 days, average KT ≥ 0.5
  //  · ≥ 6 tracker days within the same window
  // Returns the underlying numbers so the UI can render progress bars.
  bonusProgress: () => {
    const { ktHistory, trackerDays } = get()
    const window = 30
    const recentKT = (ktHistory || []).filter((e) => {
      const ts = new Date(e.date).getTime()
      return Number.isFinite(ts) && ts >= Date.now() - window * 86400000
    })
    const ktSamples = recentKT.length
    const ktAvg = ktSamples
      ? recentKT.reduce((s, e) => s + e.kt, 0) / ktSamples
      : 0
    const trackerCount = countWithinLastDays(trackerDays || [], window)
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
  },

  checkBonusEligibility: () => get().bonusProgress().eligible,

  unlockBonus: () => {
    if (!get().bonusProgress().eligible) return []
    const already = new Set(get().bonusUnlocked)
    const bonusIds = ['au1', 'au2']
    const newly = bonusIds.filter((id) => !already.has(id))
    if (!newly.length) return []
    const next = { bonusUnlocked: [...get().bonusUnlocked, ...newly] }
    set(next)
    persist({ ...get(), ...next })
    return newly
  },
}))
