export const AWARENESS_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
export const BONUS_IDS = ['au1', 'au2']

export const isAwarenessId = (id) => AWARENESS_ORDER.includes(id)
export const isBonusId = (id) => BONUS_IDS.includes(id)

// Returns the next awareness id not yet in `unlockedSet`, or null.
export function nextAwareness(unlockedSet) {
  for (const id of AWARENESS_ORDER) {
    if (!unlockedSet.has(id)) return id
  }
  return null
}

// Bonus eligibility — mirrors src/store/useProgressStore.js bonusProgress.
// Spec is ambiguous; per docs/13-client-brief.md item (a) we currently
// use the "positive KT trend within a month" interpretation until the
// client confirms.
export function evaluateBonus({ ktEntriesRecent, trackerCountRecent }) {
  const ktReq = 2
  const trackerReq = 6
  const samples = ktEntriesRecent.length
  const avg = samples ? ktEntriesRecent.reduce((s, e) => s + e.kt, 0) / samples : 0
  return {
    eligible: samples >= ktReq && avg >= 0.5 && trackerCountRecent >= trackerReq,
    ktSamples: samples,
    ktReq,
    ktAvg: Number(avg.toFixed(2)),
    trackerCount: trackerCountRecent,
    trackerReq,
    window: 30,
  }
}
