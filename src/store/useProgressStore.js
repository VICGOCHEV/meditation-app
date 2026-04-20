import { create } from 'zustand'
import { todayISO } from '../utils/dateHelpers'

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

  checkBonusEligibility: () => {
    const { completedPractices, trackerDays } = get()
    const allAwarenessDone = awarenessOrder.every((id) => completedPractices.includes(id))
    return allAwarenessDone && trackerDays.length >= 6
  },

  unlockBonus: () => {
    if (!get().checkBonusEligibility()) return []
    const bonusIds = ['au1', 'au2']
    const next = { bonusUnlocked: Array.from(new Set([...get().bonusUnlocked, ...bonusIds])) }
    set(next)
    persist({ ...get(), ...next })
    return bonusIds
  },
}))
