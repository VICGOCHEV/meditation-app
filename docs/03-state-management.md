# 03 — State management

Four Zustand stores, no global provider. Each store loads its slice of
state from `localStorage` at module init (or via `restoreSession` for
auth) and persists writes synchronously.

## `useAuthStore` — `src/store/useAuthStore.js`

| Field | Type | Default |
|---|---|---|
| `token` | `string \| null` | `null` |
| `user` | `{ id, email, name } \| null` | `null` |
| `isAuthenticated` | `boolean` | `false` |

**Actions**

| Action | Effect |
|---|---|
| `login(token, user)` | Writes both to `localStorage` keys `auth_token` / `auth_user`, flips `isAuthenticated`. |
| `logout()` | Clears both keys and flags. |
| `restoreSession()` | Re-hydrates from `localStorage` on app boot — called in `App.jsx`'s mount effect. |

LS keys: `auth_token`, `auth_user`.

## `usePlayerStore` — `src/store/usePlayerStore.js`

| Field | Default | Notes |
|---|---|---|
| `currentPractice` | `null` | Set from Player on mount (not strictly required). |
| `isPlaying` | `false` | Live state from useAudio. |
| `position` | `0` | Live; also persisted per-practice (see below). |
| `volume` | `1` | 0..1. |
| `selectedVoice` | `'male' \| 'female'` (LS-restored, default `'male'`) | |
| `selectedMusic` | `1 \| 2 \| 3` (LS-restored, default `1`) | |

**Actions**: `setCurrentPractice, setPlaying, setPosition, setVolume,
setVoice, setMusic, savePosition(id, sec), loadPosition(id),
clearPosition(id)`.

LS keys:
- `player_voice`, `player_music`
- `player_pos_<practiceId>` per practice (5 s interval write from `AudioPlayer`,
  cleared on completion).

## `useCheckinStore` — `src/store/useCheckinStore.js`

Single LS key: `checkin_state`.

| Field | Default | Notes |
|---|---|---|
| `lastCheckinDate` | `null` (or LS) | ISO string. |
| `todayCheckinDone` | computed via `isToday(lastCheckinDate)` | Re-computed by `checkIfDoneToday()`. |
| `lastIS` | `null \| number` | 0..40. |

**Actions**

| Action | Effect |
|---|---|
| `completeCheckin({ q1, q2, q3, q4 })` | Computes `IS = calcIS(...)`, writes LS, returns IS. |
| `checkIfDoneToday()` | Re-runs `isToday(lastCheckinDate)`, syncs `todayCheckinDone`. |
| `reset()` | Clears LS + state. |

## `useProgressStore` — `src/store/useProgressStore.js`

Single LS key: `progress_state`.

| Field | Default |
|---|---|
| `subscription` | `{ active: false, expiresAt: null }` |
| `unlockedPractices` | `[]` (string ids) |
| `completedPractices` | `[]` |
| `trackerDays` | `[]` (ISO date strings, sorted) |
| `lastDeepAnalysisDate` | `null` |
| `lastKT` | `null` |
| `ktHistory` | `[ { date, kt } ]`, capped at 12 |
| `bonusUnlocked` | `[]` |

**Actions**

| Action | Effect |
|---|---|
| `activateSubscription(days = 30)` | Sets active, expiresAt = now+days, unlocks `'a1'`. |
| `cancelSubscription()` | Flips active to false. |
| `unlockNextPractice()` | Returns next id in `awarenessOrder = ['a1'..'a6']` not yet unlocked, or `null`. |
| `markPracticeComplete(id)` | Pushes id (idempotent). |
| `addTrackerDay(date = todayISO())` | Pushes & sorts. |
| `recordDeepAnalysis(kt)` | Updates `lastKT`, history (trim to 12), `lastDeepAnalysisDate`. |
| `bonusProgress()` | Returns `{ eligible, window: 30, ktSamples, ktReq: 2, ktAvg, trackerCount, trackerReq: 6 }` — the underlying numbers behind the bonus condition. Profile renders this as two progress bars; DeepAnalysis only reads `eligible` indirectly via `unlockBonus()`. |
| `checkBonusEligibility()` | Thin wrapper: `bonusProgress().eligible`. |
| `unlockBonus()` | If eligible, adds the missing ids from `['au1','au2']` to `bonusUnlocked` (idempotent) and returns **only the newly added** ids — DeepAnalysis result screen renders one callout per new id. |

Bonus condition (per spec — «Положительная динамика КТ в течение
месяца вместе с отметками в трекере»):

```
window = 30 days
ktSamples ≥ 2  AND  mean(KT in window) ≥ 0.5  AND  tracker days in window ≥ 6
```

`persist(state)` is called inside every mutating action with a snapshot
that excludes any future ephemeral fields.

## How they cooperate

- `Checkin.completeCheckin()` writes `useCheckinStore` and POSTs via mock
  API. It does **not** touch progress.
- `Player.onEnd` calls `useProgressStore.markPracticeComplete(id)` +
  `addTrackerDay()` and clears the per-practice position via
  `usePlayerStore.clearPosition(id)`.
- `DeepAnalysis` finish: `recordDeepAnalysis(kt)` then `unlockNextPractice()`
  on the CTA click.
- `Subscription.onPay` calls `useProgressStore.activateSubscription(30)`
  (which also unlocks `'a1'`).
- `Profile` reads from all four stores; `logout` triggers `useAuthStore.logout()`
  but **does not wipe progress** (intentional — progress is per-device, not
  per-account in mock-mode).
