import { create } from 'zustand'
import { todayISO } from '../utils/dateHelpers'
import { api, USE_MOCK } from '../api/client'
import { fetchProgress, completePractice as apiCompletePractice } from '../api/progress'
import { mockPractices } from '../api/mock'
import { COMPLETION_PENDING_KEY, clearCompletionPending } from './pendingSyncKeys'

const KEY = 'progress_state'

// Цепочка прогрессии для mock-режима. Зеркалит backend/utils/progressionRules:
// блок «Расслабление» открыт всегда, остальные блоки идут сквозной цепочкой.
// В проде цепочку считает сервер по контенту CMS.
const MOCK_CHAIN = {
  free: mockPractices.relaxation.map((p) => p.id),
  sequence: [
    ...mockPractices.awareness,
    ...mockPractices.awareness2,
    ...mockPractices.author,
  ].map((p) => p.id),
}

const defaults = {
  // Подписка отключена 2026-07-30 — весь контент бесплатный. Поле оставлено,
  // чтобы уже лежащий у юзеров localStorage-снимок не ломал гидратацию.
  subscription: { active: true, autoRenew: false, expiresAt: null, tier: null },
  // Бесплатный блок открыт всегда; сервер отдаёт его в составе unlockedPractices.
  unlockedPractices: USE_MOCK ? [...MOCK_CHAIN.free] : [],
  completedPractices: [],
  trackerDays: [],
  lastDeepAnalysisDate: null,
  lastKT: null,
  ktHistory: [],
  // 'start' | 'mid' | 'final' | null — пришло от сервера.
  daCheckpoint: null,
  // { id, reason, freeLeft? } — что мешает открыть следующую практику.
  nextAwarenessUnlock: { id: null, reason: 'free-not-completed' },
}

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {}
    // Снимки, сохранённые до 2026-07-30, несут active:false и залочили бы
    // весь контент до первого успешного ответа сервера.
    return { ...defaults, ...saved, subscription: { ...defaults.subscription } }
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

// ── Mock-режим: зеркала серверных progressionRules ──────────────────────────
function mockNextUnlock({ unlockedPractices, completedPractices }) {
  const unlocked = new Set(unlockedPractices)
  const completed = new Set(completedPractices)
  const idx = MOCK_CHAIN.sequence.findIndex((id) => !unlocked.has(id))
  if (idx === -1) return { id: null, reason: 'all-unlocked' }
  if (idx === 0) {
    const freeLeft = MOCK_CHAIN.free.filter((id) => !completed.has(id)).length
    if (freeLeft > 0) return { id: null, reason: 'free-not-completed', freeLeft }
    return { id: MOCK_CHAIN.sequence[0], reason: 'unlock' }
  }
  if (!completed.has(MOCK_CHAIN.sequence[idx - 1])) {
    return { id: null, reason: 'prev-not-completed' }
  }
  return { id: MOCK_CHAIN.sequence[idx], reason: 'unlock' }
}

function mockDaCheckpoint({ unlockedPractices, completedPractices, ktHistory }) {
  const unlockedInChain = MOCK_CHAIN.sequence.filter((id) => unlockedPractices.includes(id))
  if (!unlockedInChain.length) return null
  const ktCount = ktHistory.length
  if (ktCount === 0) return 'start'
  if (ktCount === 1) {
    const first3 = MOCK_CHAIN.sequence.slice(0, 3)
    return first3.every((id) => completedPractices.includes(id)) ? 'mid' : null
  }
  if (ktCount === 2) {
    const cycleEnd = MOCK_CHAIN.sequence[5] ?? MOCK_CHAIN.sequence.at(-1)
    return cycleEnd && completedPractices.includes(cycleEnd) ? 'final' : null
  }
  return null
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

  // Подписка отключена 2026-07-30 (docs/38). Экран оплаты выведен из роутинга;
  // действие оставлено как явная точка отказа — если что-то в старой сборке
  // всё-таки дёрнет активацию, она упадёт заметно, а не «тихо купит».
  activateSubscription: async () => {
    throw new Error('Подписка отключена: все практики доступны бесплатно')
  },

  cancelSubscription: async () => {
    if (USE_MOCK) return
    await api.delete('/subscription')
    await get().loadFromServer()
  },

  // Отметка прохождения + трекер-день. Сервер решает, какая практика
  // открывается следующей (backend/utils/progressionRules.js), и возвращает
  // её id в newlyUnlockedId — плеер показывает это в финальной модалке.
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
        const res = await apiCompletePractice(id)
        await get().loadFromServer()
        return { id, newlyUnlockedId: res?.newlyUnlockedId ?? null }
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
        return { id, newlyUnlockedId: null }
      }
    }

    // Mock: сами открываем следующую и пересчитываем чекпоинт DA.
    const s = get()
    const unlock = mockNextUnlock(s)
    const unlockedPractices = unlock.id
      ? [...s.unlockedPractices, unlock.id]
      : s.unlockedPractices
    set({
      unlockedPractices,
      nextAwarenessUnlock: mockNextUnlock({ ...s, unlockedPractices }),
      daCheckpoint: mockDaCheckpoint({ ...s, unlockedPractices }),
    })
    persist(get())
    return { id, newlyUnlockedId: unlock.id }
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

  // Записывает результат DA. «Глубокий анализ» больше ничего не открывает —
  // открытие целиком в markPracticeComplete.
  recordDeepAnalysis: async ({ answers, IT, IO, KT }) => {
    if (USE_MOCK) {
      const entry = { date: new Date().toISOString(), kt: KT }
      const ktHistory = [...get().ktHistory, entry].slice(-12)
      set({ lastDeepAnalysisDate: entry.date, lastKT: KT, ktHistory })
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
