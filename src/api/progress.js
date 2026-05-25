import { api, USE_MOCK, delay } from './client'

// Default state for mock-mode (matches what the backend would return
// for a brand-new user). Used when VITE_USE_MOCK=true so the app
// keeps working without a backend during dev.
const emptyProgress = {
  subscription: { active: false, autoRenew: false, expiresAt: null },
  unlockedPractices: [],
  completedPractices: [],
  trackerDays: [],
  lastDeepAnalysisDate: null,
  lastKT: null,
  ktHistory: [],
  daCheckpoint: null,
  nextAwarenessUnlock: { id: null, reason: 'sub-not-active' },
}

// GET /api/progress — full user state. Returns null on auth failure
// so the caller can fall back to local LS-only mode.
export async function fetchProgress() {
  if (USE_MOCK) {
    await delay(60)
    return emptyProgress
  }
  try {
    const { data } = await api.get('/progress')
    return data
  } catch (err) {
    if (err?.response?.status === 401) return null
    throw err
  }
}

// POST /api/practices/:id/complete — idempotent.
// Server records the completion AND the tracker day.
export async function completePractice(id) {
  if (USE_MOCK) {
    await delay(120)
    return { ok: true, practiceId: id }
  }
  const { data } = await api.post(`/practices/${id}/complete`)
  return data
}
